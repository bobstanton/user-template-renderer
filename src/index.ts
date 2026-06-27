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
  cacheKey?: string;
  clearContainer?: boolean;
  rootClassName?: string;
  setupRoot?: (container: HTMLElement) => void;
  ownerDocument?: Document;
}

type TemplateFunction = (...args: unknown[]) => unknown;

const DEFAULT_MAX_CACHE_SIZE = 100;
const templateCache = new Map<string, TemplateFunction>();

export class UserTemplateRenderError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'UserTemplateRenderError';
  }
}

export function clearUserTemplateCache(): void {
  templateCache.clear();
}

export function renderUserHtmlTemplate(options: RenderUserHtmlTemplateOptions): HTMLElement {
  const { container } = options;
  const argNames = options.args.map(arg => arg.name);
  const argValues = options.args.map(arg => arg.value);
  const templateFunction = getCompiledTemplate(options.mode, options.template, argNames, options.cacheKey);
  const rendered = templateFunction(...argValues);

  if (typeof rendered !== 'string') {
    throw new UserTemplateRenderError('Template must return an HTML string');
  }

  const doc = options.ownerDocument ?? container.ownerDocument;
  const fragmentHost = doc.createElement('template');
  fragmentHost.innerHTML = rendered;

  if (options.clearContainer ?? true) {
    container.replaceChildren();
  }
  container.appendChild(fragmentHost.content);

  if (options.rootClassName) {
    container.classList.add(...options.rootClassName.split(/\s+/).filter(Boolean));
  }
  options.setupRoot?.(container);

  return container;
}

function getCompiledTemplate(mode: TemplateMode, template: string, argNames: string[], cacheKey?: string): TemplateFunction {
  for (const argName of argNames) {
    validateIdentifier(argName);
  }

  const signature = `${mode}\n${argNames.join(',')}`;
  const key = cacheKey !== undefined ? `${signature}\n#${cacheKey}` : `${signature}\n${template}`;

  const cached = templateCache.get(key);
  if (cached) {
    templateCache.delete(key);
    templateCache.set(key, cached);
    return cached;
  }

  const body = mode === 'function-body'
    ? `"use strict";\n${template}`
    : `"use strict";\nreturn \`${template}\`;`;

  try {
    const compiled = new Function(...argNames, body) as TemplateFunction;
    templateCache.set(key, compiled);
    trimTemplateCache();
    return compiled;
  } catch (error) {
    throw new UserTemplateRenderError(
      `Template compilation failed: ${error instanceof Error ? error.message : String(error)}`,
      { cause: error },
    );
  }
}

function trimTemplateCache(): void {
  while (templateCache.size > DEFAULT_MAX_CACHE_SIZE) {
    const oldestKey = templateCache.keys().next().value;
    if (oldestKey === undefined) return;
    templateCache.delete(oldestKey);
  }
}

function validateIdentifier(value: string): void {
  if (!/^[A-Za-z_$][\w$]*$/.test(value)) {
    throw new UserTemplateRenderError(`Template argument "${value}" must be a valid JavaScript identifier`);
  }

  if (RESERVED_WORDS.has(value)) {
    throw new UserTemplateRenderError(`Template argument "${value}" must not be a reserved JavaScript word`);
  }
}

const RESERVED_WORDS = new Set([
  'arguments', 'await', 'break', 'case', 'catch', 'class', 'const', 'continue',
  'debugger', 'default', 'delete', 'do', 'else', 'enum', 'eval', 'export',
  'extends', 'false', 'finally', 'for', 'function', 'if', 'implements',
  'import', 'in', 'instanceof', 'interface', 'let', 'new', 'null', 'package',
  'private', 'protected', 'public', 'return', 'static', 'super', 'switch',
  'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with',
  'yield',
]);
