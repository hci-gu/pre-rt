// Only questionnaire links can survive login; never accept external redirects.
export function safeFormReturnPath(value: string | null): string {
  return value && /^\/forms\/[a-z0-9]{15}(?:\?date=\d{4}-\d{2}-\d{2})?$/.test(value)
    ? value : '/'
}

export function loginReturnPath(search: string): string {
  return safeFormReturnPath(new URLSearchParams(search).get('returnTo'))
}

export function loginReturnSearch(path: string): string {
  const safe = safeFormReturnPath(path)
  return safe === '/' ? '' : `?${new URLSearchParams({ returnTo: safe })}`
}
