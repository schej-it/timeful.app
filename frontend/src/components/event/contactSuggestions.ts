export interface ContactSearchResult {
  firstName: string
  lastName: string
  email: string
  picture: string
}

export interface ContactSearchSuggestion extends ContactSearchResult {
  queryString: string
}

export function formatContactQueryString(contact: ContactSearchResult): string {
  const firstName = contact.firstName.split(" ")[0] ?? ""
  return `${firstName} ${contact.lastName} ${contact.email}`.trim()
}

export function toContactSearchSuggestion(
  contact: ContactSearchResult
): ContactSearchSuggestion {
  return {
    ...contact,
    queryString: formatContactQueryString(contact),
  }
}
