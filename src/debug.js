
export function print_r(node,d=0) {
	let s = '';
	
	for(let i=0;i<d;++i)
		s += ' ';
	
	console.log(s,node.type,node.attrs);
	
	for(let i=0;i<node.children.length;++i)
		print_r(node.children[i],d+1);
	
	return node;
}
