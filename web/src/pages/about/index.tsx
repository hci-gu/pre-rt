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
        Undersökningen är en så kallad obervationsstudie. Du som studiedeltagare
        startar vaginalstavsterapin före strålstart istället för efter avslutad
        strålbehandling vilket är praxis idag.{' '}
      </p>
      <br></br>
      <p>
        Du kommer få svara på ett större frågeformulär vid två tillfällen, ett
        före strålbehandlingsstart och ett tre månader efter avslutad
        strålbehandling. Frågorna handlar om kvinnohälsa, sexuell hälsa,
        förlossning, menstruation och allmän hälsa. Under strålbehandlingstiden
        fyller du i ett dagligt formulär med korta frågor om du har använt
        vaginalstaven och om mätning av vaginal längd. Med hjälp av dina svar
        kan vi få mer kunskap och förfina metoden för att förebygga vaginala
        förändringar och påverkan sexuell hälsa i samband med cancerbehandling.
        Dina svar hjälper oss att förstå förändring och symtom över tid.
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
