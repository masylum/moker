import { splitProps, type JSX } from "solid-js"

/** One native control for table actions, drawers and setup. */
export function Button(props: JSX.ButtonHTMLAttributes<HTMLButtonElement>) {
  const [local, rest] = splitProps(props, ["class", "type"])
  return <button type={local.type ?? "button"} class={local.class} {...rest} />
}
