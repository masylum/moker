import { For, Show } from "solid-js"

export function RiichiSticks(props: { count: number; spent?: boolean; compact?: boolean }) {
  // Keep the scatter stable while room snapshots and stick counts update.
  const scatter: string[] = []
  const transform = (index: number) =>
    (scatter[index] ??=
      `translate(${Math.random() * 8 - 4}px, ${Math.random() * 6 - 3}px) rotate(${Math.random() * 24 - 18}deg)`)
  return (
    <Show when={props.count > 0 || props.spent}>
      <div
        class="riichi-stick-count"
        classList={{ "compact-sticks": props.compact }}
        role="img"
        aria-label={`${props.count} fishing sticks`}
      >
        <Show when={props.spent}>
          <img class="spent-stick" src="/assets/sticks/riichi-decor.svg?v=4" alt="" />
        </Show>
        <Show when={props.count > 0}>
          <div class="riichi-stick-art" aria-hidden="true">
            <For each={Array.from({ length: props.count }, (_, index) => index)}>
              {(index) => (
                <img
                  src="/assets/sticks/riichi-decor.svg?v=4"
                  alt=""
                  style={{ transform: transform(index) }}
                />
              )}
            </For>
          </div>
          <span class="stick-tag">{props.count} Fish</span>
        </Show>
      </div>
    </Show>
  )
}

export function RiichiDeclared() {
  return (
    <div class="riichi-declared">
      <div>
        <img src="/assets/sticks/riichi-decor.svg?v=4" alt="" />
        <img src="/assets/sticks/riichi-decor.svg?v=4" alt="" />
      </div>
      <span class="stick-tag">Riichi declared</span>
    </div>
  )
}
