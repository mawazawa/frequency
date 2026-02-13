import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { brandCopyV1 } from '@/lib/content/brand-copy.generated'
import { getEquinoxAssets } from '@/lib/content/equinox-assets'

type Props = {
  params: Promise<{ token: string }>
}

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Enter The Equinox | Private Invitation',
  description: 'Private invitation page for Equinox immersion.',
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
}

function isInviteEnabled(): boolean {
  return process.env.FREQUENCY_INVITE_PAGE_ENABLED !== 'false'
}

function isTokenValid(token: string): boolean {
  const expected = process.env.FREQUENCY_INVITE_TOKEN_EQUINOX?.trim()
  if (!expected) return false
  return token === expected
}

export default async function EnterEquinoxInvitePage({ params }: Props) {
  const { token } = await params

  if (!isInviteEnabled() || !isTokenValid(token)) {
    notFound()
  }

  const copy = brandCopyV1.privateInvites.equinox
  const assets = getEquinoxAssets(process.env.FREQUENCY_INVITE_IMAGE_SET)

  if (assets.length === 0) {
    notFound()
  }

  const ctaHref = process.env.FREQUENCY_INVITE_CTA_URL || copy.cta.defaultHref

  return (
    <main className="min-h-screen bg-[#050806] text-[#F1E8D4]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(156,124,73,0.18),transparent_38%),radial-gradient(circle_at_90%_10%,rgba(45,91,66,0.16),transparent_40%),linear-gradient(180deg,#040605_0%,#070c08_38%,#050806_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-35 [background-image:linear-gradient(rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.04)_1px,transparent_1px)] [background-size:44px_44px]" />

      <section className="relative mx-auto w-full max-w-6xl px-6 pb-14 pt-20 md:px-10">
        <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#9B7E4A66] bg-[#9B7E4A1A] px-4 py-1.5 text-[11px] uppercase tracking-[0.22em] text-[#D7C092]">
          {copy.eyebrow}
        </p>
        <h1 className="max-w-3xl font-[var(--font-cormorant)] text-5xl font-semibold leading-[0.92] tracking-tight text-[#F7F0DF] md:text-7xl">
          {copy.title}
        </h1>
        <p className="mt-5 max-w-2xl font-[var(--font-space-grotesk)] text-base leading-relaxed text-[#D6CBB3] md:text-lg">
          {copy.subtitle}
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3 font-[var(--font-space-grotesk)] text-sm text-[#B9AB8D]">
          <span className="rounded-full border border-[#304934] px-3 py-1">{copy.dateRange}</span>
          <span className="rounded-full border border-[#304934] px-3 py-1">{copy.location}</span>
        </div>

        <p className="mt-8 max-w-3xl font-[var(--font-space-grotesk)] text-lg leading-relaxed text-[#D6C7A5]">
          {copy.summary}
        </p>

        <div className="mt-10 flex flex-wrap gap-4">
          <a
            href={ctaHref}
            className="inline-flex items-center justify-center rounded-md border border-[#B59053] bg-[#A27A3D] px-6 py-3 font-[var(--font-space-grotesk)] text-sm font-medium uppercase tracking-[0.14em] text-[#14110A] transition hover:bg-[#BC9456]"
          >
            {copy.cta.label}
          </a>
          <p className="self-center font-[var(--font-space-grotesk)] text-sm text-[#B8A88A]">
            {copy.cta.supportingText}
          </p>
        </div>
      </section>

      <section className="relative mx-auto grid w-full max-w-6xl gap-4 px-6 pb-14 md:grid-cols-12 md:px-10">
        <div className="md:col-span-7">
          <img
            src={`/images/events/equinox/${assets[0].file}`}
            alt={assets[0].alt}
            width={assets[0].width}
            height={assets[0].height}
            className="h-[460px] w-full rounded-xl border border-[#9B7E4A44] object-cover shadow-[0_20px_55px_rgba(0,0,0,0.55)]"
          />
        </div>
        <div className="grid gap-4 md:col-span-5">
          {assets.slice(1, 4).map((asset) => (
            <img
              key={asset.id}
              src={`/images/events/equinox/${asset.file}`}
              alt={asset.alt}
              width={asset.width}
              height={asset.height}
              className="h-[148px] w-full rounded-xl border border-[#36503A66] object-cover shadow-[0_12px_35px_rgba(0,0,0,0.45)]"
            />
          ))}
        </div>
      </section>

      <section className="relative mx-auto grid w-full max-w-6xl gap-6 px-6 pb-12 md:grid-cols-3 md:px-10">
        {copy.sections.map((section) => (
          <article
            key={section.title}
            className="rounded-xl border border-[#2E4033] bg-[#0B120DCC] p-6 backdrop-blur"
          >
            <h2 className="font-[var(--font-cormorant)] text-3xl font-medium text-[#F0E3C7]">
              {section.title}
            </h2>
            <p className="mt-3 font-[var(--font-space-grotesk)] text-sm leading-relaxed text-[#CFC2A7]">
              {section.body}
            </p>
          </article>
        ))}
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 pb-12 md:px-10">
        <h2 className="font-[var(--font-cormorant)] text-4xl font-semibold tracking-tight text-[#F0E3C8]">
          Three-Day Architecture
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {copy.schedule.map((day) => (
            <article key={day.day} className="rounded-xl border border-[#7A633777] bg-[#100F0BAA] p-5">
              <p className="font-[var(--font-space-grotesk)] text-[11px] uppercase tracking-[0.18em] text-[#B89A67]">
                {day.day}
              </p>
              <h3 className="mt-2 font-[var(--font-cormorant)] text-3xl text-[#F2E8D2]">{day.focus}</h3>
              <ul className="mt-3 space-y-2 font-[var(--font-space-grotesk)] text-sm text-[#CEC2A9]">
                {day.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-[8px] h-1.5 w-1.5 rounded-full bg-[#AD8A52]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 pb-16 md:px-10">
        <h2 className="font-[var(--font-cormorant)] text-4xl font-semibold tracking-tight text-[#F0E3C8]">
          Investment
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {copy.pricing.map((tier) => (
            <article key={tier.tier} className="rounded-xl border border-[#35503B66] bg-[#0C130F] p-6">
              <p className="font-[var(--font-space-grotesk)] text-xs uppercase tracking-[0.16em] text-[#AFC19D]">
                {tier.tier}
              </p>
              <p className="mt-2 font-[var(--font-cormorant)] text-5xl text-[#FAE7BF]">${tier.priceUsd}</p>
              <p className="mt-2 font-[var(--font-space-grotesk)] text-sm leading-relaxed text-[#CDC0A8]">
                {tier.description}
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="relative mx-auto w-full max-w-6xl px-6 pb-20 md:px-10">
        <div className="rounded-xl border border-[#2E4032] bg-[#0A100CCC] p-6 md:p-8">
          <p className="font-[var(--font-space-grotesk)] text-xs uppercase tracking-[0.18em] text-[#A58956]">
            Compliance
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 font-[var(--font-space-grotesk)] text-sm text-[#C9BDA3]">
            {copy.complianceNotes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <p className="mt-4 font-[var(--font-space-grotesk)] text-xs text-[#AFA286]">{copy.disclaimer}</p>
        </div>
      </section>
    </main>
  )
}
