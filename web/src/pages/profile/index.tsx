import { useAtom, useAtomValue } from 'jotai'
import { authAtom, pb, studySettingsAtom, userDataAtom } from '../../state'
import { Card } from '@/components/ui/card'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

function ProfilePage() {
  const [, setAuth] = useAtom(authAtom)
  const userData = useAtomValue(userDataAtom)
  const { treatmentEndQuestionnaire } = useAtomValue(studySettingsAtom)

  const handleLogout = () => {
    pb.authStore.clear()
    setAuth(null)
  }

  if (!userData) {
    return null
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-4xl font-black md:text-5xl">Profil</h1>
      </div>
      <Card className="border-0 bg-white p-6 shadow-none">
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <h2 className="text-xl font-black">Telefonnummer</h2>
            <p className="mt-2 text-lg font-bold">{userData.phoneNumber}</p>
          </div>
          <div>
            <h2 className="text-xl font-black">Behandlingsstart</h2>
            <div className="mt-2">
              <p>{userData.treatmentStart?.toLocaleDateString('sv-SE') ?? 'Ej angivet'}</p>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-black">Behandlingsslut</h2>
            <div className="mt-2">
              <p>{userData.treatmentEnd?.toLocaleDateString('sv-SE') ?? 'Ej angivet'}</p>
              <Link to={`/forms/${treatmentEndQuestionnaire}`} className="mt-2 inline-block font-bold underline">{userData.treatmentEnd ? 'Ändra slutdatum' : 'Ange slutdatum'}</Link>
            </div>
          </div>
        </div>
      </Card>
      <Button
        type="button"
        onClick={handleLogout}
        variant="destructive"
        className="h-12 rounded-xl px-5 font-black text-white"
      >
        <LogOut className="mr-2 h-4 w-4" />
        Logga ut
      </Button>
    </div>
  )
}

export default ProfilePage
