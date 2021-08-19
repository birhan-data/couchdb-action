const pouchdb = require('pouchdb')

async function go() {
  console.log(process.argv)
  const DOC_ID = process.argv[2]
  const OLD_STUDY_ID = process.argv[3]
  const NEW_STUDY_ID = process.argv[4]
  const NEXT_INDIVIDUAL_ID = process.argv[5]
  const PARTICIPANT_ID = process.argv[6]

  const db = new pouchdb(process.env.URL)
  const doc = await db.get(DOC_ID)

  if (doc.type === 'case') {
    const next_individual_id_input = doc.items[0].inputs.find(input => input.name === 'next_individual_id')
    if (next_individual_id_input) {
      const next_individual_id = next_individual_id_input.value
      if (next_individual_id !== NEXT_INDIVIDUAL_ID) {
        // change the next_individual_id in the case
        next_individual_id_input.value = NEXT_INDIVIDUAL_ID
        let participant = doc.participants.find(participant => participant.id === PARTICIPANT_ID)
        if (participant) {
          participant.data.ident_value = NEW_STUDY_ID
        }
        try {
          await db.put(doc)
          console.log(`Changed Case ${doc._id}`)
        } catch (err) {
          console.log(`error saving case doc: ${err.message}`)
          return -1
        }
      }

      // Loop through existing form response docs and change the study_id
      const caseEvents = doc.events
      for (const caseEvent of caseEvents) {
        const eventForms = caseEvent.eventForms.filter(_ => _.participantId === PARTICIPANT_ID)
        for (const eventForm of eventForms) {
          const formResponseId = eventForm.formResponseId
          if (formResponseId) {
            const formResponseDoc = await db.get(formResponseId)
            let changed = false
            for (let item of formResponseDoc.items) {
              let form_input = item.inputs.find(input => input.value === OLD_STUDY_ID)
              if (form_input) {
                form_input.value = NEW_STUDY_ID
                console.log(`Changed ${form_input.name} to ${form_input.value}`)
                changed = true
              }
            }
            if (changed) {
              try {
                await db.put(formResponseDoc)
                console.log(`Changed Study ID in Form Response ${formResponseDoc._id}`)
              } catch (err) {
                console.log(`error saving form response doc: ${err.message}`)
                return -1
              }
            }
          }
        }
      }
    }
  }
}

try {
  go()
} catch (err) {
  console.log(err.message)
}
