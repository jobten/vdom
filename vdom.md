# vdom

## 一. vnode

- vnode是用来描述原生dom结构的js对象。

- 可以减少DOM的操作，提升性能。

### 1. vnode的节点类型

vnode的节点类型包括以下几种：

1. 文本节点
2. 普通标签
3. 组件节点
4. 类组件

```javascript
const VNodeTypes = {
    HTML: 'HTML',
    TEXT: 'TEXT',
    COMPONENT: 'COMPONENT',
  	CLASS_COMPONENT: 'CLASS_COMPONENT'
}
```

### 2. 子节点类型

子节点类型包括以下几种：

1. 空子节点
2. 单子节点
3. 多子节点

```javascript
const ChildTypes = {
    EMPTY: 'EMPTY',
    SINGLE: 'SINGLE',
    MULTIPLE: 'MULTIPLE'
} 
```

### 3. 新建虚拟DOM

1. 传入tag(名字), data(属性), children(子元素)
2. 根据tag判断节点类型(HTML, TEXT, COMPONENT)，并赋值给flags
3. 返回VNode对象，包含:
   - flags, 用于标记节点类型
   - tag，标签，如createElment时可用
   - data，如：style, class, @, 其他attribute
   - key
   - children
   - childrenFlags
   - el, 当前挂载的元素节点

**注意：**纯文本类型的VNode，其children属性存储的是与之相符的文本内容

```javascript
function createElement(tag, data = null, children = null) {
    let flags
    if (typeof(tag) === 'string') {
        flags = VNodeTypes.HTML
    } else if (typeof(tag) === 'function') {
        flags = VNodeTypes.COMPONENT // 暂时未实现
    } else {
        // 创建文本节点时，不需要tag和data
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
// 新建文本类型vnode
function createTextVNode(text) {
    return {
        flags: VNodeTypes.TEXT,
        tag: null,
        data: null,
        children: text, // 纯文本类型的VNode，其children属性存储的是与之相符的文本内容
        childFlags: ChildTypes.EMPTY
    }
}

// 举例
createElement('div', null, [
  createElement('p', { key: 'a' ,style:{color:'blue'}}, '节点1'),
  createElement('p', { key: 'b' ,'@click':()=>{alert('呵呵')}}, '节点2'),
  createElement('p', { key: 'c' }, '节点3'),
  createElement('p', { key: 'd'}, '节点4'),
])
```

## 二. 渲染真实dom

1. 传入vnode(需要渲染的vnode)，container(父节点)

2. 如果没有旧的vnode时，使用mount函数挂载全新的vnode，否则调用patch函数打补丁
3. 将新的vnode添加到container的vnode属性上，在下次render则会走patch流程

```javascript
function render(vnode, container) {
  const preVNode = container.vnode
  if (preVNode == null) {
      // 没有旧的 VNode，使用 `mount` 函数挂载全新的 VNode
      mount(vnode, container)
  } else {
      // 有旧的 VNode，则调用 `patch` 函数打补丁
      patch(preVNode, vnode, container)
  }
  // 更新 container.vnode
  container.vnode = vnode
}
```

### 1. mount

调用mount函数用于挂载全新的vnode(首次挂载元素)

1. 传入需要渲染的vnode和需要挂载到哪个节点(container)
2. 通过判断flags(即VNodeType)分别进行不同的挂载(mountText或者mountElement)

```javascript
function mount(vnode, container, refNode) {
  const { flags } = vnode
  if (flags == VNodeType.HTML) {
    // 挂载普通标签
    mountElement(vnode, container, refNode)
  }else if (flags == VNodeType.TEXT) {
    // 挂载纯文本
    mountText(vnode, container)
  } 
}
```

#### mountText, 挂载纯文本

```javascript
function mountText(vnode, container) {
  const el = document.createTextNode(vnode.children)
  vnode.el = el
  container.appendChild(el)
}
```

#### mountElement, 挂载普通标签

1. 传入vnode，container和refNode

2. 通过createElement(vnode.tag)创建vnode.el

3. 挂载data数据

4. 挂载子节点

5. 挂载refNode

   ``` javascript
   // 1. 传入vnode, container, refNode
   function mountElement(vnode, container, refNode) {
     // 2. 创建vnode.el
     const el = document.createElement(vnode.tag)
     vnode.el = el
     const data = vnode.data
     // 3. 遍历data更新data数据至el中
     if (data) {
       for (let key in data) {
         patchData(el, key, null, data[key])
       }
     }
   	// 4. 挂载子节点，需要区分子节点类型为EMPTY，SINGLE，MUTIPLE的情况
     const childFlags = vnode.childFlags
     const children = vnode.children
     if (childFlags !== ChildTypes.EMPTY) {
       if (childFlags == ChildTypes.SINGLE) {
         mount(children, el)
       } else if (childFlags  == ChildTypes.MULTIPLE) {
         for (let i = 0; i < children.length; i++) {
           mount(children[i], el)
         }
       }
     }
     
     // 5. 挂载refNode
    	// 存在ref则refNode插入到el前面，不存在则直接追加el
     refNode ? container.insertBefore(el, refNode) : container.appendChild(el)
   }
   
   // 挂载data属性
   function patchData(el, key, preValue, nextValue) {
     switch (key) {
       case 'style':
         // 遍历nextValue并赋给el的style对象
         for (let k in nextValue) {
           el.style[k] = nextValue[k]
         }
         // 遍历preValue并判断是否存在于nextValue，不存在则删除
         for (let k in preValue) {
           if (!nextValue.hasOwnProperty(k)) {
             el.style[k] = ''
           }
         }
         break
       case 'class':
         // 这里只考虑一个class
         el.className = nextValue
         break
       default:
         // 事件
         if (key[0] === '@') {
           // 移除旧事件
           if (preValue) {
             el.removeEventListener(key.slice(1), preValue)
           }
           // 添加新事件
           if (nextValue) {
             el.addEventListener(key.slice(1), nextValue)
           }
         } else {
           // 当做 Attr 处理
           el.setAttribute(key, nextValue)
         }
         break
     }
   }
   ```

### 2. patch

已存在vnode情况下，调用patch函数用于打补丁

1. 若preFlags不等于nextFlags则直接替换旧的节点

2. 若nextFlags文本节点，则patchText

3. 若nextFlags普通标签，则patchElement

   ```javascript
   function patch(preVNode, nextVNode, container) {
     const nextFlags = nextVNode.flags
     const preFlags = preVNode.flags
   
     if (preFlags !== nextFlags) {
       replaceVNode(preVNode, nextVNode, container)
     } else if (nextFlags == VNodeType.HTML) {
       patchElement(preVNode, nextVNode, container)
     } else if (nextFlags == VNodeType.TEXT) {
       patchText(preVNode, nextVNode)
     }
   }
   ```

#### replaceVNode

```javascript
function replaceVNode(preVNode, nextVNode, container) {
  // 1. 移除旧节点
  container.removeChild(preVNode.el)
  // 2. 重新挂载新节点
  // 注意不可以直接container.appendChild(nextVNode.el),此时还没有nextVNode.el
  mount(nextVNode, container)
}
```

#### patchText

```javascript
function patchText(preVNode, nextVNode) {
  // 1. 拿到文本节点el，同时让nextVNode.el指向preVNode.el
  const el = (nextVNode.el = preVNode.el)
  // 2. 将el.nodeValue赋值为nextVNode.children
  if (nextVNode.children !== preVNode.children) {
    el.nodeValue = nextVNode.children
  }
}
```

####patchElement

```javascript
function patchElement(preVNode, nextVNode, container) {
  // 1. 若preVNode的tag和nextVNode的tag值不一样则直接调用replaceVNode
  if (preVNode.tag !== nextVNode.tag) {
    replaceVNode(preVNode, nextVNode, container)
    return
  }
  // 2. 拿到文本节点el，同时让nextVNode.el指向preVNode.el
  const el = (nextVNode.el = preVNode.el)
  // 3. 更新新节点的data数据
  const preData = preVNode.data
  const nextData = nextVNode.data
  if (nextData) {
    for (let key in nextData) {
      const preValue = preData[key]
      const nextValue = nextData[key]
      patchData(el, key, preValue, nextValue)
    }
  }
  // 4. 删除旧节点中不存在于新节点的数据
  if (preData) {
    for (let key in preData) {
      const preValue = preData[key]
      if (preValue && !nextData.hasOwnProperty(key)) {
        patchData(el, key, preValue, null)
      }
    }
  }
  
  // 5. 调用 patchChildren 函数递归的更新子节点
  patchChildren(
    preVNode.childFlags, // 旧的 VNode 子节点的类型
    nextVNode.childFlags, // 新的 VNode 子节点的类型
    preVNode.children, // 旧的 VNode 子节点
    nextVNode.children, // 新的 VNode 子节点
    el // 当前标签元素，即这些子节点的父节点
  )
}
```

##### patchChildren

