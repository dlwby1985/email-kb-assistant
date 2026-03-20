import { useState, useEffect, useCallback } from 'react'
import type { Contact } from '../types'

interface UseContactsReturn {
  contacts: Contact[]
  loading: boolean
  error: string | null
  createContact: (data: Partial<Contact>) => Promise<Contact>
  updateContact: (slug: string, data: Partial<Contact>) => Promise<void>
  deleteContact: (slug: string) => Promise<void>
  searchContacts: (query: string) => Promise<Contact[]>
  refresh: () => Promise<void>
}

export function useContacts(): UseContactsReturn {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadContacts = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list = await window.electronAPI.contactsList()
      setContacts(list)
    } catch (err: any) {
      setError(err.message || 'Failed to load contacts')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadContacts()
  }, [loadContacts])

  const createContact = useCallback(async (data: Partial<Contact>): Promise<Contact> => {
    try {
      const contact = await window.electronAPI.contactsCreate(data)
      await loadContacts() // Refresh list
      return contact
    } catch (err: any) {
      setError(err.message || 'Failed to create contact')
      throw err
    }
  }, [loadContacts])

  const updateContact = useCallback(async (slug: string, data: Partial<Contact>) => {
    try {
      await window.electronAPI.contactsUpdate(slug, data)
      await loadContacts() // Refresh list
    } catch (err: any) {
      setError(err.message || 'Failed to update contact')
      throw err
    }
  }, [loadContacts])

  const deleteContact = useCallback(async (slug: string) => {
    try {
      await window.electronAPI.contactsDelete(slug)
      await loadContacts() // Refresh list
    } catch (err: any) {
      setError(err.message || 'Failed to delete contact')
      throw err
    }
  }, [loadContacts])

  const searchContacts = useCallback(async (query: string): Promise<Contact[]> => {
    try {
      return await window.electronAPI.contactsSearch(query)
    } catch (err: any) {
      setError(err.message || 'Failed to search contacts')
      return []
    }
  }, [])

  return {
    contacts,
    loading,
    error,
    createContact,
    updateContact,
    deleteContact,
    searchContacts,
    refresh: loadContacts,
  }
}
