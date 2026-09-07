#!/usr/bin/env python3
"""Wrapper around build_a5_tracing.py for sandboxes whose mount cannot unlink.

build_a5_tracing.build_one() os.remove()s the intermediate -A5-tracing.pdf
proof after moving the print file into place. On the Cowork device mount that
raises PermissionError and kills the run, so this wrapper redirects os.remove
to a move into _to_delete/tracing-proofs/ -- exactly what _patched_trace.py
already does for the letter books. Nothing else changes.

Usage: python3 _patched_a5_tracing.py --all
"""
import os
import shutil
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
STRAY = os.path.join(REPO, '_to_delete', 'tracing-proofs')

_real_remove = os.remove


def _remove(path, *a, **k):
    try:
        return _real_remove(path, *a, **k)
    except PermissionError:
        os.makedirs(STRAY, exist_ok=True)
        try:
            shutil.move(path, os.path.join(STRAY, os.path.basename(path)))
        except Exception as exc:            # last resort: leave it, say so
            print('  [stale] could not remove or move %s (%s)' % (path, exc))


os.remove = _remove
sys.path.insert(0, HERE)
import build_a5_tracing                                          # noqa: E402

build_a5_tracing.main()
