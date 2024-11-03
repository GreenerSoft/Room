/*! Room-nm v1.0.0 | (c) GreenerSoft | https://roomjs.fr | MIT License */


var Room = (() => {
	"use strict";

	let primitive = Symbol.toPrimitive
	let room = Symbol()
	let prim = Symbol()
	let nodes = new WeakMap
	let vars = new WeakMap
	let maps = new WeakMap
	let updates= new Map
	let captures = []
	let locked = [0]
	let updateId = 0
	let D = document
	let O = Object
	let R = Reflect
	let proto = O.getPrototypeOf
	let entries = O.entries
	let isArray = Array.isArray
	let errorFunc = console.error
	let isNull = x => x == null
	let isObject = o => o instanceof O
	let isString = s => typeof s == "string" || s instanceof String
	let isElement = e => e instanceof Element
	let isFunction = f => typeof f == "function"
	let isPlainObject = o => o && proto(o) === O.prototype
	let isNativeFunction = f => f.toString().replace(/ |\n/g, "") == "function" + f.name + "(){[nativecode]}"
	let isPrimitive = o => isObject(o) && prim in o
	let flat = a => a.flat(Infinity)
	let normalize = s => s ? s.replace(/_/g, "-") : s
	let canProxify = o => isObject(o) && (isArray(o) || isPlainObject(o) || !isNativeFunction(o.constructor))
	let capture = t => (captures.length > locked[0]) && captures[0].push(t)

	let dispatch = (n, e) => {
		if (n.children) {
			[...n.children].forEach(c => dispatch(c, e));
			nodes.has(n) && (n.dispatchEvent(new Event(e)), !n.isConnected && nodes.delete(n) && n.remove());
		}
	}

	let run = (func, ...params) => {
		try {
			return func(...params);
		} catch(error) {
			errorFunc === func ? console.error(error) : run(errorFunc, error);
		}
	}

	let grab = func => (captures.unshift([]), [run(func), new Set(captures.shift())])

	let val = (value, param, isHandler) => {
		if (isObject(value) && value[prim]) {
			return val(value.value, param, isHandler);
		} else {
			return !isHandler && isFunction(value) ? val(run(value, param), param) : value;
		}
	}

	let addUpdate = target => {
		let data = vars.get(target);
		data && data.forEach((node, param) => updates.set(param, node));
		updates.size && (updateId = updateId || requestAnimationFrame(() => {
			updates.forEach((node, param) => node ? runSetter(true, node, param) : createEffect(param));
			updates.clear();
			updateId = 0;
		}));
	}

	let proxyHandler = {
		get: (target, property, receiver) => (property === room ? target : (capture(target), R.get(target, property, receiver))),
		set: (target, property, value) => (!O.is(target[property], value) && (target[property] = proxify(value), addUpdate(target)), true),
		defineProperty: (target, property, descriptor) => (addUpdate(target), R.defineProperty(target, property, descriptor)),
		deleteProperty: (target, property) => (addUpdate(target), R.deleteProperty(target, property)),
		ownKeys: target => (capture(target), R.ownKeys(target))
	}

	let proxify = data => {
		if (canProxify(data) && !data[room]) {
			entries(data).forEach(([k, v]) => data[k] = proxify(v));
			data[room] = true;
			data = new Proxy(data, proxyHandler);
		}
		return data;
	}

	let unproxify = data => {
		let result = data;
		if (isPrimitive(data)) {
			result = data.value;
		} else if (canProxify(data) && data[room]) {
			result = isArray(data) ? [] : {};
			entries(data[room]).forEach(([k, v]) => result[k] = unproxify(v));
		}
		return result;
	}

	let addTargets = (add, node, targets, param) => {
		let data;
		targets.forEach(t => (data = vars.get(t)) ? add && data.set(param, node) : vars.set(t, new Map([[param, node]])));
	}

	let eventHandler = function(event) {
		let listener = (nodes.get(this) || {})[event.type];
		listener && (run(listener.bind(this), event) === false) && (event.preventDefault(), event.stopPropagation());
	}

	let setAttr = (node, name, value, isHandler) => {
		if (isHandler) {
			name = name.toLowerCase().slice(2);
			let data = nodes.get(node);
			data && (delete data[name], node.removeEventListener(name, eventHandler));
			if (isFunction(value)) {
				data ? data[name] = value : nodes.set(node, {[name]: value});
				node.addEventListener(name, eventHandler);
			}
		} else {
			let d = O.getOwnPropertyDescriptor(proto(node), name);
			d && d.set ? d.set.bind(node)(value) : node[(isNull(value) ? "remove" : "set") + "Attribute"](name, value);
		}
		return node;
	}

	let setNode = (node, value, update) => {
		if (isNull(value)) {
			update && node.remove();
		} else {
			if (isElement(value)) {
				update ? node.replaceWith(value) : node.append(value);
			} else {
				update ? ((node.data !== value) && (node.data = value), value = node) : node.append(value = new Text(value));
			}
		}
		return value;
	}

	let addData = (update, node, targets, param, newNode) => node && targets.size && addTargets(!update || (node !== newNode), newNode, targets, param)

	let runSetter = (update, node, param) => {
		let [values, targets] = grab(() => val(param.v, node, param.h));
		!(values = flat([values])).length && addData(update, node, targets, param, node);
		values.forEach(v => addData(update, node, targets, param, param.a ? setAttr(node, param.a, v, param.h) : setNode(node, v, update)));
	}

	const append = (element, ...contents) => (isElement(element) && flat(contents).forEach(v => {
		if (isPlainObject(v) && !(primitive in v)) {
			entries(v).forEach(([a, v]) => runSetter(false, element, {v, a: normalize(a), h: a.toLowerCase().startsWith("on")}));
		} else {
			runSetter(false, element, {v});
		}
	}), element)

	const h = function(tagName, ...contents) {
		return append(this && isString(this) ? D.createElementNS(this, tagName) : D.createElement(tagName), ...contents);
	}

	const elements = nameSpace => new Proxy(h, {get: (p, tagName) => p.bind(nameSpace, normalize(tagName))})

	const createData = data => proxify(canProxify(data) ? data : {
		[prim]: true,
		[primitive]() {return this.value},
		value: data
	})

	const getData = data => unproxify(val(data));

	const setData = (data, value) => {
		if (data !== value) {
			if (isPrimitive(data)) {
				data.value = isPrimitive(value) ? value.value : canProxify(value) ? data.value : value;
			} else if (canProxify(data) && canProxify(value) && !isPrimitive(value) && (proto(data) === proto(value))) {
				isArray(data) ? data.length = 0 : O.keys(data[room]).forEach(k => delete data[k]);
				O.assign(data, data[room] ? value : unproxify(value));
			}
		}
	}

	const createEffect = (effect, ...dependencies) => {
		let [values, targets] = grab(effect);
		[...dependencies].forEach(d => d && (d = d[room]) && targets.add(d));
		addTargets(true, null, targets, effect);
		return values;
	}

	const untrack = (func) => (locked.unshift(captures.length), func = val(func), locked.shift(), func)

	const onError = func => isFunction(func) && (errorFunc = func)

	const map = (container, data, func) => (maps.set(container, new WeakMap), createEffect(() => untrack(() => {
		let key, value, node, infos, k, v, newNode;
		let mapNodes = maps.get(container);
		let getKey = () => isArray(data) ? Number(key) : key;
		let createNode = () => (newNode = run(func, value, k = createData(getKey()), data)) && mapNodes.set(newNode, [k, value]);
		let children = container.children;
		let items = entries(data);
		let i = 0;
		while (i < children.length) {
			node = children[i];
			if ((infos = mapNodes.get(node)) && (i < items.length)) {
				[key, value] = items[i++];
				[k, v] = infos;
				if (v === value) {
					k.value = getKey();
				} else {
					if (items.slice(i).find(e => e[1] === v)) {
						newNode = [...children].slice(i).find(n => (infos = mapNodes.get(n)) && (infos[1] === value));
						(newNode || createNode()) && container.insertBefore(newNode, node);
					} else {
						mapNodes.delete(node);
					}
					i--;
				}
			} else {
				node.remove();
			}
		}
		while (i < items.length) {
			[key, value] = items[i++];
			createNode() && container.append(newNode);
		}
		return container;
	}), data))

	D.addEventListener('visibilitychange', () => dispatch(D.body, D.hidden ? "pagehide" : "pageshow"))

	new MutationObserver(mutations => {
		mutations.forEach(m => {
			[...m.addedNodes].forEach(n => dispatch(n, "mount"));
			[...m.removedNodes].forEach(n => dispatch(n, "unmount"));
		});
	}).observe(D.body, {childList: true, subtree: true});
		
	return {append, h, elements, createData, setData, getData, createEffect, untrack, onError, map};
})()
