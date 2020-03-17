import {parse_template_literal} from './templates';
import {build_dom} from './dom';

export let t = (parts,...args) => build_dom(parse_template_literal(parts,...args),'http://www.w3.org/1999/xhtml');
export let svg = (parts,...args) => build_dom(parse_template_literal(parts,...args),'http://www.w3.org/2000/svg');
