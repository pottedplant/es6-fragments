
function is_node(o){
	return (
		typeof Node === "object" ? o instanceof Node : 
		o && typeof o === "object" && typeof o.nodeType === "number" && typeof o.nodeName==="string"
	);
}

function to_node(v) {
	if( v==null ) return null;
	if( is_node(v) ) return v;
	
	return document.createTextNode(v);
}

export function build_element(node,parent,named,ns) {
	switch(node.type) {
	
	case 'text':
		return document.createTextNode(node.attrs.value);
		
	case 'argument': {
		let value = node.attrs.value;
		
		if( !Array.isArray(value) )
			return to_node(value);
		
		let values = [];
		
		for(let i=0;i<value.length;++i) {
			let v = to_node(value[i]);
			if( v!=null )
				values.push(v);
		}
			
		return values;
	} break;
		
	case 'name':
		named[node.attrs.value] = parent;
		break;
	
	case 'tag': {
		let tag = document.createElementNS(ns,node.attrs.name);
		
		let children = build_elements(node.children,tag,named,ns);
		for(let i=0;i<children.length;++i)
			tag.appendChild(children[i]);
		
		return tag;
	} break;
	
	case 'attribute': {
		let name = node.attrs.name;
		let value = null;
		
		if( node.children.length==1 ) {
			let values = node.children[0].children;
			value = '';
			
			for(let i=0;i<values.length;++i)
				switch(values[i].type) {
				case 'text': value += values[i].attrs.value; break;
				case 'argument': if( values[i].attrs.value!=null ) value+=values[i].attrs.value; break;
				default: throw new Error(`unexpected node type '${values[i].type}'`);
				}
		}
		
		if( value==null ) {
			let a = document.createAttributeNS(ns,name);
			parent.setAttributeNode(a);
		} else
			parent.setAttribute(name,value);
		
	} break;
	
	case 'comment': {
		let comment = '';
		
		for(let i=0;i<node.children.length;++i) {
			let child = node.children[i];
			switch(child.type) {
			case 'text': comment += child.attrs.value; break;
			case 'argument': if( child.attrs.value!=null ) comment += child.attrs.value; break;
			default: throw new Error(`unexpected node type '${child.type}'`);
			}
		}
		
		return document.createComment(comment);
	} break;

	default: throw new Error(`unexpected node type '${node.type}'`);
	}
}

export function build_elements(nodes,parent,named,ns) {
	let r = [];
	
	for(let i=0;i<nodes.length;++i) {
		let t = build_element(nodes[i],parent,named,ns);
		if( t==null ) continue;
		if( Array.isArray(t) ) {
			for(let j=0;j<t.length;++j)
				if( t[j]!=null )
					r.push(t[j]);
		} else
			r.push(t);
	}
	
	return r;
}

export function build_dom(root,ns){
	let named = {};
	
	let elems = build_elements(root.children,null,named,ns);
	
	let r = elems.length==1 ? elems[0] : elems;
	if( !('root' in named) )
		named.root = r;
	
	return named;
}
