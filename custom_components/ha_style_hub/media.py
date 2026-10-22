"""Uploaded dashboard background images.

The theme page lets the user pick an image file. The browser sends it to
``/api/ha_style_hub/background`` (an authenticated, admin-only endpoint), the
file is stored in ``<config>/www/ha_style_hub/`` and from then on served at
``/ha_style_hub-media/<name>``. The theme only keeps that URL.

The pieces that touch the disk are plain functions (run in the executor), the
view around them is thin - that keeps them testable without a running Home
Assistant.
"""

from __future__ import annotations

import hashlib
import logging
import os
import time
from http import HTTPStatus
from typing import Any

from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from .const import (
    DOMAIN,
    MEDIA_DIR_PARTS,
    MEDIA_EXTENSIONS,
    MEDIA_FILE_PREFIX,
    MEDIA_MAX_BYTES,
    MEDIA_UPLOAD_URL,
    MEDIA_URL,
)
from .runtime import get_store

_LOGGER = logging.getLogger(__name__)

# A file this young is never deleted: it was probably uploaded a moment ago
# and the page has not saved it yet.
PRUNE_MIN_AGE = 600


def media_dir(hass: HomeAssistant) -> str:
    """Return the folder the images live in."""
    return hass.config.path(*MEDIA_DIR_PARTS)


def detect_extension(data: bytes) -> str | None:
    """Return png / jpg / gif / webp from the first bytes, or None.

    The content decides, not the name or the type the browser claims. SVG is
    left out on purpose - it can carry scripts.
    """
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"\xff\xd8\xff"):
        return "jpg"
    if data[:6] in (b"GIF87a", b"GIF89a"):
        return "gif"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "webp"
    return None


def ensure_dir(path: str) -> None:
    """Create the folder if it is missing (blocking, run in the executor)."""
    os.makedirs(path, exist_ok=True)


def save_image(path: str, data: bytes, extension: str) -> str:
    """Write the image and return its file name (blocking).

    The name carries a hash of the content: the same picture always gets the
    same name, a new picture a new one - so the browser never shows a cached
    older picture under an unchanged URL.
    """
    ensure_dir(path)
    digest = hashlib.sha256(data).hexdigest()[:12]
    name = f"{MEDIA_FILE_PREFIX}{digest}.{extension}"
    target = os.path.join(path, name)
    if not os.path.exists(target):
        tmp = f"{target}.tmp"
        with open(tmp, "wb") as handle:
            handle.write(data)
        os.replace(tmp, target)
    else:
        # Touch it, so a re-upload also counts as "young" for the cleanup.
        os.utime(target, None)
    return name


def referenced_names(config: Any, history: list[dict[str, Any]]) -> set[str]:
    """Return the file names the configuration and the history point at."""
    names: set[str] = set()
    sources = [config] + [entry.get("config") for entry in history]
    for source in sources:
        theme = source.get("theme") if isinstance(source, dict) else None
        if not isinstance(theme, dict):
            continue
        for mode in ("dark", "light"):
            values = theme.get(mode)
            url = values.get("dash_image") if isinstance(values, dict) else None
            if isinstance(url, str) and url.startswith(f"{MEDIA_URL}/"):
                names.add(url[len(MEDIA_URL) + 1 :])
    return names


def prune(path: str, keep: set[str], now: float | None = None) -> list[str]:
    """Delete our images that nothing points at any more (blocking).

    Only files named like the ones the upload produces are touched; anything
    else a user put into the folder stays.
    """
    removed: list[str] = []
    if not os.path.isdir(path):
        return removed
    now = time.time() if now is None else now
    for name in os.listdir(path):
        if name in keep or not name.startswith(MEDIA_FILE_PREFIX):
            continue
        if name.rsplit(".", 1)[-1] not in MEDIA_EXTENSIONS:
            continue
        target = os.path.join(path, name)
        try:
            if now - os.path.getmtime(target) < PRUNE_MIN_AGE:
                continue
            os.remove(target)
            removed.append(name)
        except OSError as err:
            _LOGGER.debug("Could not remove %s: %s", target, err)
    return removed


def remove_all(path: str) -> None:
    """Delete every image of ours and the folder, if it is empty then."""
    prune(path, set(), now=time.time() + PRUNE_MIN_AGE + 1)
    try:
        os.rmdir(path)
    except OSError:
        pass


async def async_prune(hass: HomeAssistant) -> None:
    """Delete the images no stored state refers to."""
    store = get_store(hass)
    if store is None:
        return
    keep = referenced_names(store.config, store.history)
    try:
        await hass.async_add_executor_job(prune, media_dir(hass), keep)
    except Exception:  # noqa: BLE001 - tidying up must never break saving
        _LOGGER.exception("Could not tidy up the background images")


class BackgroundUploadView(HomeAssistantView):
    """POST the raw bytes of an image, get back the URL it is served at."""

    url = MEDIA_UPLOAD_URL
    name = f"api:{DOMAIN}:background"
    requires_auth = True

    def __init__(self, hass: HomeAssistant) -> None:
        """Keep a reference to Home Assistant.

        Taken here instead of from ``request.app``: the key under which Home
        Assistant stores itself there has changed before.
        """
        self._hass = hass

    async def post(self, request: Any) -> Any:
        """Store an uploaded image."""
        hass = self._hass

        user = request.get("hass_user")
        if user is None or not getattr(user, "is_admin", False):
            return self.json_message("Admin access required", HTTPStatus.UNAUTHORIZED)

        length = request.content_length
        if length is not None and length > MEDIA_MAX_BYTES:
            return self.json_message(
                "Image too large", HTTPStatus.REQUEST_ENTITY_TOO_LARGE
            )

        chunks: list[bytes] = []
        size = 0
        async for chunk in request.content.iter_chunked(65536):
            size += len(chunk)
            if size > MEDIA_MAX_BYTES:
                return self.json_message(
                    "Image too large", HTTPStatus.REQUEST_ENTITY_TOO_LARGE
                )
            chunks.append(chunk)
        data = b"".join(chunks)

        extension = detect_extension(data)
        if extension is None:
            return self.json_message(
                "Only PNG, JPEG, GIF and WebP images are allowed",
                HTTPStatus.UNSUPPORTED_MEDIA_TYPE,
            )

        try:
            name = await hass.async_add_executor_job(
                save_image, media_dir(hass), data, extension
            )
        except OSError as err:
            _LOGGER.error("Could not store the background image: %s", err)
            return self.json_message(
                "Could not store the image", HTTPStatus.INTERNAL_SERVER_ERROR
            )

        # No tidying up here: an image that was uploaded earlier in the same
        # sitting is not referenced by anything until the user presses Save,
        # and would be deleted by the next upload once it is ten minutes old.
        # Unused files are removed after a save or reset instead.
        return self.json({"url": f"{MEDIA_URL}/{name}", "size": len(data)})
