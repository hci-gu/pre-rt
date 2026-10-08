import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp'

import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useParams } from 'react-router-dom'
import { useSetAtom } from 'jotai'
import { authAtom, pb } from '../../state'
import { useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

const loginSchema = z.object({
  password: z.string().regex(/^\d{6}$/, 'Ange den sexsiffriga koden.'),
})

function OTPPage() {
  const { token } = useParams()
  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      password: '',
    },
  })
  const setAuth = useSetAtom(authAtom)
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const autoAttempted = useRef(false)

  useEffect(() => {
    // get query params
    const urlParams = new URLSearchParams(window.location.search)

    if (urlParams.has('code') && !autoAttempted.current) {
      autoAttempted.current = true
      const code = urlParams.get('code')
      form.setValue('password', code ?? '')
      onSubmit({ password: code ?? '' })
    }
  }, [])

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    if (pending) return
    setPending(true)
    form.clearErrors()
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/otp-verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            otp: values.password,
            verifyToken: token,
          }),
        }
      )

      if (!response.ok) {
        form.setError('password', { type: 'server', message: response.status === 401 || response.status === 403
          ? 'Koden är felaktig eller har gått ut. Försök igen eller begär en ny kod.'
          : 'Det gick inte att logga in. Försök igen om en stund.' })
        return
      }

      const data = await response.json()
      pb.authStore.save(data.token, data.record)


      setAuth(pb.authStore.model)

      navigate('/')
    } catch {
      form.setError('password', { type: 'server', message: 'Det gick inte att ansluta. Kontrollera din internetanslutning och försök igen.' })
    } finally {
      setPending(false)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Engångskod</FormLabel>
              <FormControl>
                <InputOTP
                  maxLength={6}
                  value={field.value}
                  disabled={pending}
                  containerClassName="flex-wrap"
                  onChange={(value) => {
                    form.setValue('password', value)
                  }}
                >
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                  </InputOTPGroup>
                  <InputOTPSeparator />
                  <InputOTPGroup>
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </FormControl>
              <FormDescription>
                Kod skickad till ditt telefonnummer
              </FormDescription>
              <FormMessage role="alert" />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending} className="h-auto min-h-11 max-w-full whitespace-normal py-2">{pending ? "Loggar in..." : "Skicka in"}</Button>
        <Link to="/login" className="block font-bold underline">Begär en ny kod</Link>
      </form>
    </Form>
  )
}

export default OTPPage
