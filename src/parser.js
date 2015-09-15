
export class Matchers {
	
	static eq(atom) {
		return (value) => value===atom;
	}
	
	static re(def) {
		let re = new RegExp('^'+def+'$');
		return (value) => re.test(value);
	}
	
	static any() {
		return (value) => true;
	}
	
}

export class Rule {
	
	constructor(matcher,actions) {
		this.matcher = matcher;
		this.actions = actions;
	}
	
}

export class State {
	
	constructor(name) {
		this.name = name;
		this.rules = [];
	}
	
	add_rule(matcher,...actions) {
		this.rules.push(new Rule(matcher,actions));
	}
	
}

export class Node {
	
	constructor(type,attrs={},children=[]) {
		this.type = type;
		this.children = children;
		this.attrs = attrs;
	}
	
}

export class Context {
	
	constructor(node) {
		this.node = node;
	}
}

export class Parser {
	
	constructor() {
		let s = this.states = {
			
			text: new State('text'),
			
			tag_begin: new State('tag_begin'),
			tag_open_name: new State('tag_open_name'),
			tag_open: new State('tag_open'),
			tag_open_close: new State('tag_open_close'),
			
			attr_name: new State('attr_name'),
			attr_eq: new State('attr_eq'),
			attr_value: new State('attr_value'),
			attr_value_sq: new State('attr_value_sq'),
			attr_value_dq: new State('attr_value_dq'),
			
			name_begin: new State('name_begin'),
			name: new State('name'),
			
			tag_close: new State('tag_close'),
			
		};
		this.stack = [new Context(new Node('root'))];
		this.state = this.states.text;
		this.source = '';
		
		// text
		
		s.text.add_rule(Matchers.eq('<'),(ctx,atom)=>this.state=s.tag_begin);
		s.text.add_rule(Matchers.any(),(ctx,atom)=>ctx.node.children.push(new Node('text',{value:atom})));

		// <
		
		s.tag_begin.add_rule(Matchers.re('[a-z]'),(ctx,atom)=>{
			let tag = new Node('tag',{name:atom});
			ctx.node.children.push(tag);
			this.stack.push(new Context(tag));
			this.state = s.tag_open_name;
		});
		
		s.tag_begin.add_rule(Matchers.eq('/'),(ctx,atom)=>this.state=s.tag_close);
		
		// open tag
		
		s.tag_open_name.add_rule(Matchers.eq('>'),(ctx,atom)=>this.state=s.text);
		s.tag_open_name.add_rule(Matchers.eq('/'),(ctx,atom)=>this.state=s.tag_open_close);
		s.tag_open_close.add_rule(Matchers.eq('>'),(ctx,atom)=>{ this.stack.pop(); this.state=s.text; });

		s.tag_open_name.add_rule(Matchers.eq(' '),(ctx,atom)=>this.state=s.tag_open);
		
		s.tag_open_name.add_rule(Matchers.re('[a-z0-9]'),(ctx,atom)=>{
			ctx.node.attrs.name += atom;
		});
		
		s.tag_open.add_rule(Matchers.eq(' '));
		s.tag_open.add_rule(Matchers.eq('>'),(ctx,atom)=>this.state=s.text);
		s.tag_open.add_rule(Matchers.eq('/'),(ctx,atom)=>this.state=s.tag_open_close);
		
		// name
		
		s.tag_open.add_rule(Matchers.eq('@'),(ctx,atom)=>this.state=s.name_begin);
		s.name_begin.add_rule(Matchers.re('[a-zA-Z_]'),(ctx,atom)=>{
			let name = new Node('name',{value:atom});
			ctx.node.children.push(name);
			this.stack.push(new Context(name));
			this.state = s.name;
		});
		
		s.name.add_rule(Matchers.re('[a-zA-Z0-9_]'),(ctx,atom)=>ctx.node.attrs.value+=atom);
		s.name.add_rule(Matchers.eq(' '),(ctx,atom)=>{ this.stack.pop(); this.state=s.tag_open; });
		s.name.add_rule(Matchers.eq('/'),(ctx,atom)=>{ this.stack.pop(); this.state=s.tag_open_close; });
		s.name.add_rule(Matchers.eq('>'),(ctx,atom)=>{ this.stack.pop(); this.state=s.text; });
		
		// attr
		
		s.tag_open.add_rule(Matchers.re('[a-z]'),(ctx,atom)=>{
			let attr = new Node('attribute',{name:atom});
			ctx.node.children.push(attr);
			this.stack.push(new Context(attr));
			this.state = s.attr_name;
		});

		s.attr_name.add_rule(Matchers.eq('>'),(ctx,atom)=>{ this.stack.pop(); this.state=s.text; });
		s.attr_name.add_rule(Matchers.eq('/'),(ctx,atom)=>{ this.stack.pop(); this.state=s.tag_open_close; });
		s.attr_name.add_rule(Matchers.eq(' '),(ctx,atom)=>{ this.stack.pop(); this.state=s.tag_open; });
		s.attr_name.add_rule(Matchers.eq('='),(ctx,atom)=>{
			let value = new Node('value');
			ctx.node.children.push(value);
			this.stack.push(new Context(value));
			this.state = s.attr_eq;
		});
		
		s.attr_name.add_rule(Matchers.re('[a-z0-9-_]'),(ctx,atom)=>{
			ctx.node.attrs.name += atom;
		});
		
		s.attr_eq.add_rule(Matchers.eq(' '),(ctx,atom)=>{ this.stack.pop(); this.stack.pop(); this.state=s.tag_open; });
		s.attr_eq.add_rule(Matchers.eq('>'),(ctx,atom)=>{ this.stack.pop(); this.stack.pop(); this.state=s.text; });
		s.attr_eq.add_rule(Matchers.eq('/'),(ctx,atom)=>{ this.stack.pop(); this.stack.pop(); this.state=s.tag_open_close; });
		
		s.attr_eq.add_rule(Matchers.eq("'"),(ctx,atom)=>this.state=s.attr_value_sq);
		s.attr_eq.add_rule(Matchers.eq('"'),(ctx,atom)=>this.state=s.attr_value_dq);
		s.attr_eq.add_rule(Matchers.any(),(ctx,atom)=>{
			ctx.node.children.push(new Node('text',{value:atom}));
			this.state = s.attr_value;
		});
		
		s.attr_value_sq.add_rule(Matchers.eq("'"),(ctx,atom)=>{ this.stack.pop(); this.stack.pop(); this.state=s.tag_open; });
		s.attr_value_sq.add_rule(Matchers.any(),(ctx,atom)=>ctx.node.children.push(new Node('text',{value:atom})));

		s.attr_value_dq.add_rule(Matchers.eq('"'),(ctx,atom)=>{ this.stack.pop(); this.stack.pop(); this.state=s.tag_open; });
		s.attr_value_dq.add_rule(Matchers.any(),(ctx,atom)=>ctx.node.children.push(new Node('text',{value:atom})));

		s.attr_value.add_rule(Matchers.eq(' '),(ctx,atom)=>{ this.stack.pop(); this.stack.pop(); this.state=s.tag_open; });
		s.attr_value.add_rule(Matchers.eq('>'),(ctx,atom)=>{ this.stack.pop(); this.stack.pop(); this.state=s.text; });
		s.attr_value.add_rule(Matchers.eq('/'),(ctx,atom)=>{ this.stack.pop(); this.stack.pop(); this.state=s.tag_open_close; });
		s.attr_value.add_rule(Matchers.re('[a-zA-Z0-9-_]'),(ctx,atom)=>ctx.node.children.push(new Node('text',{value:atom})));
		
		// close tag
		
		let close_tag_matcher = (atom,ctx) => {
			let current = (ctx.close_tag || '');
			let expected = ctx.node.attrs.name;
			switch(atom) {
			case '>': return expected===current;
			default:
				return expected && expected.indexOf(current)===0;
			}
		};
		
		s.tag_close.add_rule(close_tag_matcher,(ctx,atom)=>{
			switch(atom) {
			case '>': this.stack.pop(); this.state=s.text; return;
			default: ctx.close_tag = (ctx.close_tag || '') + atom;
			}
		});
		
	}
	
	push(text) {
		// note: unclean unicode handling
		for(let i=0;i<text.length;++i)
			this.push_atom(text[i]);
	}
	
	push_atom(atom) {
		this.source += atom;
		let ctx = this.ctx();
		let rules = this.state.rules;
		for(let i=0;i<rules.length;++i) {
			let rule = rules[i];
			if( rule.matcher(atom,ctx) ) {
				let actions = rule.actions;
				for(let j=0;j<actions.length;++j)
					actions[j](ctx,atom);
				return;
			}
		}
		
		this.parse_error(`unexpected atom '${atom}'`);
	}
	
	complete() {
		if( this.state!==this.states.text )
			this.parse_error('unclosed tags');
		
		if( this.stack.length!==1)
			this.parse_error('unclosed tags');
		
		let node = this.stack[0].node;
		Parser.collapse(node);
		return node;
	}
	
	ctx() {
		return this.stack[this.stack.length-1];
	}
	
	parse_error(message) {
		throw new Error(`parse error in '${this.source}' state=='${this.state.name}': ${message}`);
	}
	
	static collapse(node) {
		let last = null;
		for(let i=0;i<node.children.length;) {
			let c = node.children[i];
			Parser.collapse(c);
			if( c.type!=='text' ) {
				last = null;
				++i; continue;
			}
			
			if( last!=null ) {
				last.attrs.value += c.attrs.value;
				node.children.splice(i,1);
				continue;
			}
			
			last = c;
			++i;
		}
			
	}
	
}
