export type TemplateMode = 'function-body' | 'template-literal';
export interface TemplateArgument {
    name: string;
    value: unknown;
}
export interface RenderUserHtmlTemplateOptions {
    template: string;
    mode: TemplateMode;
    args: TemplateArgument[];
    container: HTMLElement;
    sanitize: (html: string) => DocumentFragment;
    cacheKey?: string;
    clearContainer?: boolean;
    rootClassName?: string;
    setupRoot?: (container: HTMLElement) => void;
}
export declare class UserTemplateRenderError extends Error {
    constructor(message: string, options?: {
        cause?: unknown;
    });
}
export declare function clearUserTemplateCache(): void;
export declare function renderUserHtmlTemplate(options: RenderUserHtmlTemplateOptions): HTMLElement;
//# sourceMappingURL=index.d.ts.map