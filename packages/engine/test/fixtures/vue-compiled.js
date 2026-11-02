// Output of @vue/compiler-sfc@3.5 (inlineTemplate) for a sample SFC; used as a scanner fixture.
import { createElementVNode as _createElementVNode, createStaticVNode as _createStaticVNode, openBlock as _openBlock, createElementBlock as _createElementBlock } from "vue"

const _hoisted_1 = ["open"]
const _hoisted_2 = ["data-variant"]

import { ref } from 'vue'

export default {
  __name: 'X',
  setup(__props) {

const v = ref('destructive'); const open = ref(false)

return (_ctx, _cache) => {
  return (_openBlock(), _createElementBlock("article", null, [
    _cache[2] || (_cache[2] = _createStaticVNode("<header><h3>Title</h3></header><table><thead><tr><th>A</th></tr></thead><tbody><tr><td>1</td></tr><tr><td>2</td></tr><tr><td>3</td></tr><tr><td>4</td></tr><tr><td>5</td></tr><tr><td>6</td></tr></tbody></table>", 2)),
    _createElementVNode("button", {
      "data-variant": "destructive",
      onClick: _cache[0] || (_cache[0] = $event => (open.value = true))
    }, "Delete"),
    _cache[3] || (_cache[3] = _createElementVNode("span", {
      "data-badge": "",
      "data-variant": "secondary"
    }, "New", -1 /* CACHED */)),
    _createElementVNode("dialog", { open: open.value }, [...(_cache[1] || (_cache[1] = [
      _createElementVNode("p", null, "Sure?", -1 /* CACHED */)
    ]))], 8 /* PROPS */, _hoisted_1),
    _createElementVNode("div", {
      role: "alert",
      "data-variant": v.value
    }, "x", 8 /* PROPS */, _hoisted_2)
  ]))
}
}

}
