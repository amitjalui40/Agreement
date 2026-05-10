import { useRef, useState } from 'react'
import './App.css'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

const createClientSigner = () => ({
  id: globalThis.crypto.randomUUID(),
  name: '',
  signatureText: '',
  date: '',
  signatureFile: null,
  signaturePreview: '',
})

function App() {
  const [formData, setFormData] = useState({
    projectName: 'Exp Live Entertainment Website / Design & Development Project',
    agreementDate: '',
    freelancerContactName: '',
    freelancerContactEmail: '',
    freelancerContactPhone: '',
    clientContactName: '',
    clientContactEmail: '',
    clientContactPhone: '',
    freelancer1SignatureText: '',
    freelancer1Date: '',
    freelancer2SignatureText: '',
    freelancer2Date: '',
  })
  const [clientSigners, setClientSigners] = useState([
    createClientSigner(),
    createClientSigner(),
  ])
  const [signaturePreviews, setSignaturePreviews] = useState({
    freelancer1: '',
    freelancer2: '',
  })
  const [saveStatus, setSaveStatus] = useState({ state: 'idle', message: '' })
  const [isExporting, setIsExporting] = useState(false)
  const [validationErrors, setValidationErrors] = useState([])
  const agreementRef = useRef(null)

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSignatureUpload = (role, event) => {
    const file = event.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    setSignaturePreviews((prev) => ({ ...prev, [role]: previewUrl }))
  }

  const handleClientSignerChange = (signerId, field, value) => {
    setClientSigners((prev) =>
      prev.map((signer) =>
        signer.id === signerId ? { ...signer, [field]: value } : signer,
      ),
    )
  }

  const handleClientSignatureUpload = (signerId, event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const previewUrl = URL.createObjectURL(file)

    setClientSigners((prev) =>
      prev.map((signer) =>
        signer.id === signerId
          ? { ...signer, signatureFile: file, signaturePreview: previewUrl }
          : signer,
      ),
    )
  }

  const addClientSigner = () => {
    setClientSigners((prev) => [...prev, createClientSigner()])
  }

  const removeClientSigner = (signerId) => {
    setClientSigners((prev) => prev.filter((signer) => signer.id !== signerId))
  }

  const getValidationErrors = () => {
    const errors = []
    const requiredTextFields = [
      ['projectName', 'Project name is required.'],
      ['freelancerContactName', 'Freelancer side contact name is required.'],
      ['freelancerContactEmail', 'Freelancer side contact email is required.'],
      ['freelancerContactPhone', 'Freelancer side contact phone number is required.'],
      ['clientContactName', 'Client side contact name is required.'],
      ['clientContactEmail', 'Client side contact email is required.'],
      ['clientContactPhone', 'Client side contact phone number is required.'],
    ]
    const requiredDateFields = [
      ['agreementDate', 'Agreement date is required.'],
      ['freelancer1Date', 'Freelancer 1 date is required.'],
      ['freelancer2Date', 'Freelancer 2 date is required.'],
    ]

    requiredTextFields.forEach(([key, message]) => {
      if (!formData[key].trim()) errors.push(message)
    })
    requiredDateFields.forEach(([key, message]) => {
      if (!formData[key]) errors.push(message)
    })

    if (!formData.freelancer1SignatureText.trim() && !signaturePreviews.freelancer1) {
      errors.push('Freelancer 1 signature is required.')
    }
    if (!formData.freelancer2SignatureText.trim() && !signaturePreviews.freelancer2) {
      errors.push('Freelancer 2 signature is required.')
    }

    clientSigners.forEach((signer, index) => {
      const label = `Client signer ${index + 1}`
      if (!signer.name.trim()) errors.push(`${label} name is required.`)
      if (!signer.date) errors.push(`${label} date is required.`)
      if (!signer.signatureText.trim() && !signer.signaturePreview) {
        errors.push(`${label} signature is required.`)
      }
    })

    return errors
  }

  const handleSaveAndShare = async () => {
    if (!agreementRef.current) return

    const errors = getValidationErrors()

    if (errors.length > 0) {
      setValidationErrors(errors)
      setSaveStatus({
        state: 'error',
        message: 'Please fill all required fields before generating PDF.',
      })
      return
    }

    try {
      setValidationErrors([])
      setIsExporting(true)
      setSaveStatus({ state: 'saving', message: 'Preparing PDF file...' })
      await new Promise((resolve) => setTimeout(resolve, 100))

      const canvas = await html2canvas(agreementRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      const pdf = new jsPDF('p', 'mm', 'a4')
      const pageWidth = 210
      const pageHeight = 297
      const margin = 8
      const imgWidth = pageWidth - margin * 2
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      let heightLeft = imgHeight
      let position = margin

      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', margin, position, imgWidth, imgHeight)
      heightLeft -= pageHeight - margin * 2

      while (heightLeft > 0) {
        position = heightLeft - imgHeight + margin
        pdf.addPage()
        pdf.addImage(
          canvas.toDataURL('image/png'),
          'PNG',
          margin,
          position,
          imgWidth,
          imgHeight,
        )
        heightLeft -= pageHeight - margin * 2
      }

      const safeProjectName = (formData.projectName || 'agreement')
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, '-')
        .replaceAll(/^-+/g, '')
        .replaceAll(/-+$/g, '')
      const fileName = `${safeProjectName || 'agreement'}-${Date.now()}.pdf`
      pdf.save(fileName)

      const blob = pdf.output('blob')
      const shareFile = new File([blob], fileName, { type: 'application/pdf' })
      if (globalThis.navigator.canShare?.({ files: [shareFile] })) {
        await globalThis.navigator.share({
          files: [shareFile],
          title: 'Project Agreement',
          text: 'Signed agreement PDF',
        })
      }

      setSaveStatus({
        state: 'success',
        message: 'PDF downloaded successfully. You can now share it.',
      })
    } catch (error) {
      setSaveStatus({
        state: 'error',
        message: error.message || 'Unable to generate PDF.',
      })
    } finally {
      setIsExporting(false)
    }
  }

  const renderSignaturePreview = (role, fallbackText) => {
    if (signaturePreviews[role]) {
      return (
        <img
          src={signaturePreviews[role]}
          alt={`${role} signature`}
          className="signature-preview"
        />
      )
    }

    if (fallbackText) {
      return <p className="typed-signature">{fallbackText}</p>
    }

    return <p className="signature-placeholder">No signature added yet</p>
  }

  const renderClientSignaturePreview = (signer, index) => {
    if (signer.signaturePreview) {
      return (
        <img
          src={signer.signaturePreview}
          alt={`client signer ${index + 1} signature`}
          className="signature-preview"
        />
      )
    }

    if (signer.signatureText) {
      return <p className="typed-signature">{signer.signatureText}</p>
    }

    return <p className="signature-placeholder">No signature added yet</p>
  }

  return (
    <div className={`page ${isExporting ? 'exporting' : ''}`}>
      <main className="agreement" ref={agreementRef}>
        <header className="agreement-header">
          <h1>Project Agreement - Exp Live Entertainment</h1>
          <p>
            This agreement is between both parties for the design and development
            work by Amit Jalui and Karankumar Mailaram for Exp Live Entertainment, an event
            organizer company (Exp Live Entertainment Team).
          </p>
        </header>

        <section>
          <h2>Project Scope</h2>
          <ul>
            <li>Modern premium UI/UX design</li>
            <li>AI-assisted design workflow</li>
            <li>AI token/API credit usage during design and development workflow</li>
            <li>Frontend/design/development implementation</li>
            <li>Website structure planning and creative thinking process</li>
            <li>Image research, matching, optimization, and asset handling</li>
            <li>Responsive design optimization for multiple screen sizes/devices</li>
            <li>Performance-focused implementation and clean UI experience</li>
            <li>Design references, layout research, and visual experimentation</li>
            <li>Bug fixing and testing during development</li>
            <li>
              Required revisions and normal changes related to finalized
              requirements
            </li>
            <li>
              Time investment in planning, execution, creative direction, and
              implementation
            </li>
            <li>
              Coordination, communication, and project management related to the
              workflow
            </li>
          </ul>
        </section>

        <section className="two-col">
          <div>
            <h2>Project Cost</h2>
            <ul>
              <li>Final agreed amount: Rs. 18,000</li>
              <li>Initial advance payment: Rs. 5,000</li>
            </ul>
          </div>
          <div>
            <h2>Payment Terms</h2>
            <ul>
              <li>Advance payment will be made before continuing further work.</li>
              <li>
                Remaining payment will be completed as per project progress/final
                delivery.
              </li>
              <li>
                Delays in payment may affect the project timeline and workflow.
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2>Revision &amp; Change Policy</h2>
          <ul>
            <li>
              The project includes reasonable revisions and adjustments related to
              finalized requirements.
            </li>
            <li>Normal small changes/fixes will not be charged.</li>
            <li>
              Major design changes, repeated redesign requests, structural changes,
              or new feature requests after finalization may include additional
              charges.
            </li>
            <li>
              Charges for major changes/features will depend on the requirements
              from the Client or our Team.
            </li>
            <li>
              Final pricing for additional work can be mutually negotiated by both
              parties.
            </li>
          </ul>
        </section>

        <section>
          <h2>Maintenance Support</h2>
          <ul>
            <li>
              After completion of the base project requirements, free maintenance
              support will be provided for 1 month.
            </li>
            <li>
              Maintenance support only includes minor bug fixes and small
              adjustments related to the existing project.
            </li>
            <li>
              New features, redesign requests, structural changes, or additional
              functionality during the maintenance period may include additional
              charges.
            </li>
          </ul>
        </section>

        <section>
          <h2>Client Responsibilities</h2>
          <ul>
            <li>
              The client team should provide required content, images, approvals,
              references, and feedback on time.
            </li>
            <li>
              Delays in communication or approvals from the client side may affect
              the estimated project timeline.
            </li>
          </ul>
        </section>

        <section>
          <h2>Timeline &amp; Workflow</h2>
          <ul>
            <li>Work will be handled professionally and properly from both sides.</li>
            <li>
              Project timeline depends on requirement finalization, communication
              flow, approvals, revision flow, content availability, and payment
              flow.
            </li>
            <li>
              Timeline mentioned during discussions should be considered as an
              estimated/tentative timeline and may change depending on project
              requirements and workflow.
            </li>
          </ul>
        </section>

        <section>
          <h2>Project Pause or Cancellation</h2>
          <ul>
            <li>
              If the project is paused for a long duration from the client side,
              timelines and delivery schedules may be adjusted accordingly.
            </li>
            <li>
              If the project is cancelled after work has already started, the
              advance payment will remain non-refundable due to time, effort, AI
              resources, and work already invested.
            </li>
          </ul>
        </section>

        <section className="two-col">
          <div>
            <h2>Ownership &amp; Usage</h2>
            <ul>
              <li>
                After full payment completion, the final deliverables and project
                files will belong to the client.
              </li>
              <li>
                Amit Jalui and Karankumar Mailaram may showcase parts of the
                design/development work in their portfolio or work samples unless
                requested otherwise by the client.
              </li>
            </ul>
          </div>
          <div>
            <h2>Third-Party Services</h2>
            <ul>
              <li>
                Any paid third-party services such as hosting, domains, APIs,
                premium assets, subscriptions, or external tools will be handled
                separately and may require additional payment from the client side.
              </li>
            </ul>
          </div>
        </section>

        <section>
          <h2>Communication</h2>
          <ul>
            <li>
              Major project discussions, approvals, and confirmations should
              preferably happen in the official group or written chat for proper
              clarity and records.
            </li>
          </ul>
        </section>

        <section className="agreement-details">
          <h2>Agreement Details</h2>
          <div className="field-grid">
            <label>
              <span>Project Name</span>
              <input
                type="text"
                name="projectName"
                value={formData.projectName}
                onChange={handleInputChange}
              />
            </label>
            <label>
              <span>Agreement Date</span>
              <input
                type="date"
                name="agreementDate"
                value={formData.agreementDate}
                onChange={handleInputChange}
              />
            </label>
          </div>
          <p className="note">
            Estimated timeline may change depending on project requirements,
            communication, approvals, and payment workflow.
          </p>
        </section>

        <section className="signatures">
          <h2>Party Contact Details</h2>
          <div className="signature-grid">
            <article>
              <h3>Freelancer Side Contact</h3>
              <label>
                <span>Contact Name</span>
                <input
                  type="text"
                  name="freelancerContactName"
                  value={formData.freelancerContactName}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                />
              </label>
              <label>
                <span>Contact Email</span>
                <input
                  type="email"
                  name="freelancerContactEmail"
                  value={formData.freelancerContactEmail}
                  onChange={handleInputChange}
                  placeholder="Enter email"
                />
              </label>
              <label>
                <span>Contact Phone Number</span>
                <input
                  type="tel"
                  name="freelancerContactPhone"
                  value={formData.freelancerContactPhone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                />
              </label>
            </article>

            <article>
              <h3>Client Side Contact</h3>
              <label>
                <span>Contact Name</span>
                <input
                  type="text"
                  name="clientContactName"
                  value={formData.clientContactName}
                  onChange={handleInputChange}
                  placeholder="Enter name"
                />
              </label>
              <label>
                <span>Contact Email</span>
                <input
                  type="email"
                  name="clientContactEmail"
                  value={formData.clientContactEmail}
                  onChange={handleInputChange}
                  placeholder="Enter email"
                />
              </label>
              <label>
                <span>Contact Phone Number</span>
                <input
                  type="tel"
                  name="clientContactPhone"
                  value={formData.clientContactPhone}
                  onChange={handleInputChange}
                  placeholder="Enter phone number"
                />
              </label>
            </article>
          </div>
        </section>

        <section className="signatures">
          <h2>Freelancers</h2>
          <div className="signature-grid">
            <article>
              <h3>Freelancer 1</h3>
              <p>Name: Amit Jalui</p>
              <label>
                <span>Typed Signature</span>
                <input
                  type="text"
                  name="freelancer1SignatureText"
                  placeholder="Type full name"
                  value={formData.freelancer1SignatureText}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                <span>Date</span>
                <input
                  type="date"
                  name="freelancer1Date"
                  value={formData.freelancer1Date}
                  onChange={handleInputChange}
                />
              </label>
              <label className="no-print">
                <span>Upload Signature Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleSignatureUpload('freelancer1', event)}
                />
              </label>
              {renderSignaturePreview('freelancer1', formData.freelancer1SignatureText)}
            </article>
            <article>
              <h3>Freelancer 2</h3>
              <p>Name: Karankumar Mailaram</p>
              <label>
                <span>Typed Signature</span>
                <input
                  type="text"
                  name="freelancer2SignatureText"
                  placeholder="Type full name"
                  value={formData.freelancer2SignatureText}
                  onChange={handleInputChange}
                />
              </label>
              <label>
                <span>Date</span>
                <input
                  type="date"
                  name="freelancer2Date"
                  value={formData.freelancer2Date}
                  onChange={handleInputChange}
                />
              </label>
              <label className="no-print">
                <span>Upload Signature Image</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => handleSignatureUpload('freelancer2', event)}
                />
              </label>
              {renderSignaturePreview('freelancer2', formData.freelancer2SignatureText)}
            </article>
          </div>
        </section>

        <section className="signatures">
          <h2>Client Details</h2>
          <div className="client-actions no-print">
            <button type="button" onClick={addClientSigner}>
              + Add Client Signer
            </button>
          </div>
          <div className="signature-grid single">
            {clientSigners.map((signer, index) => (
              <article key={signer.id}>
                <div className="client-title-row">
                  <p>Company Name: Exp Live Entertainment</p>
                  {clientSigners.length > 1 && (
                    <button
                      type="button"
                      className="danger-btn no-print"
                      onClick={() => removeClientSigner(signer.id)}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <p>Client Signer {index + 1}</p>
                <label>
                  <span>Client Representative Name</span>
                  <input
                    type="text"
                    value={signer.name}
                    onChange={(event) =>
                      handleClientSignerChange(signer.id, 'name', event.target.value)
                    }
                  />
                </label>
                <label>
                  <span>Typed Signature</span>
                  <input
                    type="text"
                    placeholder="Type full name"
                    value={signer.signatureText}
                    onChange={(event) =>
                      handleClientSignerChange(
                        signer.id,
                        'signatureText',
                        event.target.value,
                      )
                    }
                  />
                </label>
                <label>
                  <span>Date</span>
                  <input
                    type="date"
                    value={signer.date}
                    onChange={(event) =>
                      handleClientSignerChange(signer.id, 'date', event.target.value)
                    }
                  />
                </label>
                <label className="no-print">
                  <span>Upload Signature Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => handleClientSignatureUpload(signer.id, event)}
                  />
                </label>
                {renderClientSignaturePreview(signer, index)}
              </article>
            ))}
          </div>
        </section>

        <footer className="acceptance">
          <h2>Agreement Acceptance</h2>
          <p>
            By signing below and continuing the project workflow/payment process,
            both parties agree to the terms and conditions mentioned in this
            agreement.
          </p>
        </footer>
      </main>

      <div className="bottom-actions no-print">
        {validationErrors.length > 0 && (
          <div className="validation-box">
            <p>Please resolve the following:</p>
            <ul>
              {validationErrors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <button type="button" onClick={handleSaveAndShare} disabled={isExporting}>
          {isExporting
            ? 'Preparing PDF...'
            : 'Print, Download and Share Agreement'}
        </button>

        {saveStatus.message && (
          <p className={`status-message ${saveStatus.state}`}>{saveStatus.message}</p>
        )}
      </div>
    </div>
  )
}

export default App
