import {Parser,Node} from './parser';

export function parse_template_literal(parts,...args) {
	let p = new Parser();
	
	for(let i=0;i<parts.length;++i) {
		p.push(parts.raw[i]);
		
		if( i!==(parts.length-1) )
			switch(p.state) {
			
			case p.states.comment_text:
			case p.states.comment_text_dash:
			case p.states.comment_end:
				p.ctx().node.children.push(new Node('argument',{value:args[i]}));
				break;
				
			case p.states.text:
				p.ctx().node.children.push(new Node('argument',{value:args[i]}));
				break;
			
			case p.states.attr_eq:
				p.ctx().node.children.push(new Node('argument',{value:args[i]}));
				p.state = p.states.attr_value;
				break;
				
			case p.states.attr_value:
			case p.states.attr_value_sq:
			case p.states.attr_value_dq:
				p.ctx().node.children.push(new Node('argument',{value:args[i]}));
				break;
				
			default: p.parse_error('invalid parser state for template literal substitution');
			}
	}
	
	return p.complete();
}
