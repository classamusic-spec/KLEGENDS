/**
 * Opaque holder for Skia objects that must travel through React.
 *
 * React 19's development build records the changed props of re-rendering
 * components for its Performance Tracks by walking them with `for…in`. On
 * web every Skia object references the CanvasKit module, which exposes the
 * whole WASM heap as typed arrays — walking it freezes the page. Private
 * fields are invisible to enumeration, so wrapped objects are safe.
 *
 * Rule: never pass a raw Skia object (SkImage, SkPicture, SkPath, …) as a
 * prop of a component that can re-render with a different value. Use an
 * opaque handle, load it inside the component, or remount via `key`.
 */
export class Opaque<T> {
  readonly #value: T;

  constructor(value: T) {
    this.#value = value;
  }

  get value(): T {
    return this.#value;
  }
}
