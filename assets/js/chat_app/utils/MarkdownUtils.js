import { default_renderer, parser, parser_write, parser_end, parse} from '../lib/mdp.js';
import { highlightAll } from '../../../../layx/others/syntax_highlighter/syntax_highlighter.js';

export class MarkdownUtils {
    static parseMarkdown(markdownText) {
        return parse(markdownText);
    }

    static getParser(element) {
        const renderer = default_renderer(element);
        return parser(renderer);
    }

    static parserWrite(parserInstance, content) {
        parser_write(parserInstance, content);
    }

    static parserEnd(parserInstance) {
        parser_end(parserInstance);
    }

    static highlightCode() {
        highlightAll();
    }
}
