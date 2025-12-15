import { readAboutPageAtom, resourcesAtom } from '@/state'
import { useAtomValue, useSetAtom } from 'jotai'
import { useEffect } from 'react'
import { Separator } from '@/components/ui/separator'
import ResourceAccordion from '@/components/resourceCollection'

const Resources = () => {
  const collections = useAtomValue(resourcesAtom)

  return (
    <div className="mt-8 border-b border-black">
      {collections.map((collection) => (
        <ResourceAccordion collection={collection} />
      ))}
    </div>
  )
}

const HeaderSection = ({ text }: { text: string }) => {
  return (
    <div className="mb-8 bg-primary text-center py-4">
      <h2 className="text-2xl font-black text-white">{text.toUpperCase()}</h2>
    </div>
  )
}

function AboutPage() {
  const setRead = useSetAtom(readAboutPageAtom)
  useEffect(() => {
    setRead(true)
  }, [])

  return (
    <div className="[&>p]:mx-4 [&>h2]:mx-4">
      <HeaderSection text="Om studien" />
      <p>
        <strong>
          Syftet med studien är att undersöka vid vilken tidpunkt som det är
          mest optimalt att påbörja vaginalstavsanvändning för att begränsa
          vaginala förändringar som beror på strålbehandlingens effekter. Vi
          vill förstå hur vården kan utveckla information och uppföljning till
          kvinnor om metoder för att bibehålla vävnadens elasticitet och
          förhindra att sammanlänkning av slidlemhinnan sker.
        </strong>
      </p>
      <br></br>
      <h2 className="font-bold">Hur går studien till?</h2>
      <p>
        Undersökningen är en så kallad randomiserad kontrollerad studie. Det
        innebär att du som är studiedeltagare kommer att lottas till vilken
        grupp du kommer att ingå i. Grupp 1 startar med vaginalstavsanvändning
        före strålbehandlingsstart. Grupp 2 startar med vaginalstavsanvändning
        efter avslutad strålbehandling. Oavsett vilken grupp du hamnar i kommer
        du att få samma information och rådgivning och det som skiljer grupperna
        åt är vid vilken tidpunkt som man startar upp användning av vaginalstav.
      </p>
      <br></br>
      <p>
        Under studiens gång kommer du att få svara på enkäter vid fyra
        tillfällen under sammanlagt ett år samt fylla i dagbok under en
        åttaveckors-period. Enkäterna innehåller frågor om kvinnohälsa, sexuell
        hälsa, förlossning, menstruation och andra allmänna frågor. Dagboken
        innehåller korta frågor om du har använt vaginalstaven, och mätning av
        vaginal längd. Med hjälp av dina svar kan vi i sjukvården få mer kunskap
        och förbättra vårdens sätt att informera om och behandla vaginala
        förändringar samt påverkan på sexualitet i samband med en
        cancerbehandling.
      </p>
      <br></br>
      <HeaderSection text="Frågor & Svar" />
      <p>
        Sexuell hälsa är ett grundbehov och en viktig del i många människors
        liv. Det kan vara oroande att få en påverkan på den sexuella hälsan. Vi
        ser på sexuell hälsa ur både ett fysiskt, psykiskt och psykosocialt
        perspektiv och vet att sexuell praktik (hur, när och med vem man har
        sex) formas av normer, genus och kultur.
      </p>
      <p>
        Inom ramen för forskningsprojektet utvecklar vi även digitala verktyg,
        det vill säga digitaliserad information via webbsida och mobilapp för
        att förbättra informationsvägarna för egenvårdsråd.
      </p>
      <Separator className="mt-4" />
      <Resources />
      <div style={{ height: '25vh' }}></div>
    </div>
  )
}

export default AboutPage
