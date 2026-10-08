import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useSetAtom } from 'jotai'
import { authAtom, pb } from '../../state'

import { z } from 'zod'

const resetSchema = z.object({
  phoneNumber: z.string().min(2, 'Ange ditt telefonnummer.').max(20, 'Kontrollera telefonnumret.'),
})

const LoginPage = () => {
  const navigate = useNavigate()
  const setAuth = useSetAtom(authAtom)
  const [testLoginAvailable, setTestLoginAvailable] = useState(false)
  const [testLoginPending, setTestLoginPending] = useState(false)
  const [testLoginError, setTestLoginError] = useState(false)
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: {
      phoneNumber: '',
    },
  })

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${import.meta.env.VITE_API_URL}/test-login`, {
      signal: controller.signal,
    })
      .then((response) => setTestLoginAvailable(response.ok))
      .catch(() => {})

    return () => controller.abort()
  }, [])

  async function onSubmit(values: z.infer<typeof resetSchema>) {
    form.clearErrors()
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/otp-create`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: values.phoneNumber }),
      })
      if (!response.ok) {
        form.setError('phoneNumber', { type: 'server', message: response.status === 404
          ? 'Kontrollera telefonnumret. Kontakta studieteamet om du inte kan logga in.'
          : 'Koden kunde inte skickas. Försök igen om en stund.' })
        return
      }
      const data = await response.json()
      navigate(`/login/${data.id}`)
    } catch {
      form.setError('phoneNumber', { type: 'server', message: 'Det gick inte att ansluta. Kontrollera din internetanslutning och försök igen.' })
    }
  }

  async function loginWithTestAccount() {
    setTestLoginPending(true)
    setTestLoginError(false)

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/test-login`,
        { method: 'POST' }
      )
      if (!response.ok) {
        throw new Error('Test login failed')
      }

      const data = await response.json()
      pb.authStore.save(data.token, data.record)
      setAuth(pb.authStore.model)
      navigate('/')
    } catch {
      setTestLoginError(true)
      setTestLoginPending(false)
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Telefonnummer</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Telefonnummer att skicka kod till..."
                    {...field}
                  />
                </FormControl>
                <FormMessage role="alert" />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={form.formState.isSubmitting} className="h-auto min-h-11 max-w-full whitespace-normal py-2">{form.formState.isSubmitting ? "Skickar kod..." : "Skicka engångskod"}</Button>
        </form>
      </Form>

      {testLoginAvailable && (
        <section className="border-t pt-6" aria-labelledby="test-login-title">
          <h2 id="test-login-title" className="font-semibold">
            Vill du bara prova appen?
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Logga in direkt med ett gemensamt testkonto. Inget SMS skickas.
          </p>
          <Button
            type="button"
            variant="outline"
            className="mt-4 h-auto min-h-11 w-full whitespace-normal py-2"
            disabled={testLoginPending}
            onClick={loginWithTestAccount}
          >
            {testLoginPending ? 'Loggar in...' : 'Prova med testkonto'}
          </Button>
          {testLoginError && (
            <p className="mt-2 text-sm text-destructive" role="alert">
              Det gick inte att logga in med testkontot. Försök igen.
            </p>
          )}
        </section>
      )}
    </div>
  )
}

export default LoginPage
