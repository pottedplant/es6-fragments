import {parse_template_literal} from './templates';
import {build_dom} from './dom';

export let t = (parts,...args) => build_dom(parse_template_literal(parts,...args));
