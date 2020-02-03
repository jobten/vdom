const VNodeTypes = {
    HTML: 'HTML',
    TEXT: 'TEXT',
    COMPONENT: 'COMPONENT'
}

const ChildTypes = {
    EMPTY: 'EMPTY',
    SINGLE: 'SINGLE',
    MULTIPLE: 'MULTIPLE'
} 

function createTextVNode(text) {
    return {
        flags: VNodeTypes.TEXT,
        tag: null,
        data: null,
        children: text, // 纯文本类型的 VNode，其 children 属性存储的是与之相符的文本内容
        childFlags: ChildTypes.EMPTY
    }
}

function createElement(tag, data = null, children = null) {
    let flags
    if (typeof(tag) === 'string') {
        flags = VNodeTypes.HTML
    } else if (typeof(tag) === 'function') {
        flags = VNodeTypes.COMPONENT
    } else {
        // 其他情况（如：直接传入文本节点）直接当做文本节点
        flags = VNodeTypes.TEXT
    }

    let childFlags
    if (children) {
        if (Array.isArray(children)) {
            if (children.length !== 0) {
                childFlags = ChildTypes.MULTIPLE
            } else {
                childFlags = ChildTypes.EMPTY
            }
        } else {
            // 当做文本节点处理, 即单个子节点, 需要调用createTextVNode创建纯文本类型VNode
            childFlags = ChildTypes.SINGLE
            children = createTextVNode(children + '') //转成字符串
        }
    } else {
        // 没有子节点
        childFlags = ChildTypes.EMPTY
    }

    return {
        flags,
        tag,
        data,
        key: data && data.key,
        children,
        childFlags,
        el: null
    }
}

function patchData(el, key, prevalue, nextvalue) {
    switch(key) {
        case 'style':
            for (const key in nextvalue) {
                el.style[key] = nextvalue[key]
            }

            for (const key in prevalue) {
                // 遍历prevalue的所有值，去除不存在于nextvalue中的值
                if (!nextvalue.hasOwnProperty(key)) {
                    el.style[key] = ''
                }
            }
            break
        case 'class':
            el.className = nextvalue
            break
        default:
            // 事件
            if (key[0] === '@') {
                // 移除旧事件
                if (prevalue) {
                    document.removeEventListener(key.slice(1), prevalue)
                }
                // 添加新事件
                if (nextvalue) {
                    document.addEventListener(key.slice(1), nextvalue)
                }
            } else {
                // 当做属性处理
                el.setAttribute(key, nextvalue)
            }
            break
    }
}

function mountChildren(children, childFlags) {
    if (childFlags === ChildTypes.SINGLE) {
        mount(children, el)
    } else if (childFlags === ChildTypes.MULTIPLE) {
        children.forEach(child => {
            mount(child, el)
        })
    }
}

function mountElement(vnode, container, refNode) {
    const el = document.createElement(vnode.tag)
    vnode.el = el
    const data = vnode.data
    if (data) {
        for (const key in data) {
            patchData(el, key, null, data[key])
        }
    }

    const { children, childFlags } = vnode
    mountChildren(children, childFlags)

    refNode ? container.insertBefore(el, refNode) : container.appendChild(el)
}

function mountText(vnode, container) {
    const el = document.createTextNode(vnode.children)
    vnode.el = el
    container.appendChild(el)
}


function mount(vnode, container, refNode) {

    if (vnode.flags === VNodeTypes.HTML) {
        // 挂载普通标签
        mountElement(vnode, container, refNode)
    } else if (vnode.flags === VNodeTypes.TEXT) {
        // 挂载纯文本
        mountText(vnode, container)
    }
}
function replaceVNode(preVNode, nextVNode, container) {
    container.removeChild(preVNode.el)
    mount(nextVNode, container)
}

function patchElement(preVNode, nextVNode, container) {
    if (preVNode.tag !== nextVNode.tag) {
        return replaceVNode(preVNode, nextVNode, container)
    }
    const el = (nextVNode.el = preVNode.el)
    const preData = preVNode.data
    const nextData = nextVNode.data
    if (nextData) {
        for (const key in nextData) {
            const preValue = preData[key]
            const nextValue = nextData[key]
            patchData(el, key, preValue, nextValue)
        }
    }
    // 删除
  if (prevData) {
    for (let key in prevData) {
      const prevValue = prevData[key]
      if (prevValue && !nextData.hasOwnProperty(key)) {
        patchData(el, key, prevValue, null)
      }
    }
  }
  
}

function patchText(preVNode, nextVNode) {
    // 拿到文本节点 el，同时让 nextVNode.el 指向该文本节点
    const el = (nextVNode.el = preVNode.el)
    // 只有当新旧文本内容不一致时才有必要更新
    if (preVNode.children !== nextVNode.children) {
        el.nodeValue = nextVNode.children
    }
}

function patch(preVNode, nextVNode, container) {
    const prevFlags = preVNode.Flags
    const nextFlags = nextVNode.Flags
    if (prevFlags !== nextFlags) {
        replaceVNode(preVNode, nextVNode, container)
    } else if (nextFlags === VNodeTypes.HTML) {
        patchElement(preVNode, nextVNode, container)
    } else if (nextFlags === VNodeTypes.TEXT) {
        patchText(preVNode, nextVNode)
    }
}

function render(vnode, container) {
    const prevnode = container.vnode
    if (prevnode == null) {
        mount(vnode, container) // 重新挂载mount
    } else {
        patch(prevnode, vnode, container)
    }
    container.vnode = vnode // 更新vnode
}