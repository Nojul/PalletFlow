export function AboutUsPage() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-8">
      {/* Header */}
      <header className="rounded-[2rem] border border-slate-800/80 bg-slate-950/70 p-8 shadow-soft backdrop-blur-xl sm:p-10">
        <div className="max-w-3xl space-y-4">
          <p className="text-sm uppercase tracking-[0.25em] text-brand-300/80">
            About PalletFlow
          </p>

          <h1 className="text-4xl font-semibold text-white sm:text-5xl">
            Better pallet planning, made simple
          </h1>

          <p className="text-lg leading-relaxed text-slate-400">
            PalletFlow is a 3D pallet optimization tool that helps you create,
            visualize, and improve pallet layouts before products are shipped.
            It combines packing algorithms with an interactive 3D view to make
            pallet planning faster and easier.
          </p>
        </div>
      </header>

      {/* Why */}
      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-7 shadow-soft">
          <h2 className="text-xl font-semibold text-white">
            Why PalletFlow was created
          </h2>

          <p className="mt-4 leading-relaxed text-slate-400">
            Creating a pallet layout is often more complicated than it seems.
            Small changes in box dimensions, weight, or orientation can
            completely change the final result.
          </p>

          <p className="mt-4 leading-relaxed text-slate-400">
            PalletFlow was built to make this process more visual and
            predictable, helping users test different layouts and understand how
            every box fits together.
          </p>
        </div>

        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-7 shadow-soft">
          <h2 className="text-xl font-semibold text-white">
            What PalletFlow helps with
          </h2>

          <ul className="mt-4 space-y-3 text-slate-300">
            <li>
              • Create pallet configurations with custom dimensions and limits
            </li>

            <li>
              • Add boxes with different sizes, quantities, and orientations
            </li>

            <li>• Generate optimized layouts using packing algorithms</li>

            <li>• Inspect pallets in 3D before physical loading</li>

            <li>• Track space usage, weight, height, and layout efficiency</li>
          </ul>
        </div>
      </section>

      {/* Features */}
      <section className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-7 shadow-soft">
        <h2 className="text-xl font-semibold text-white">
          Built around real pallet constraints
        </h2>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {[
            {
              title: "3D visualization",
              description:
                "See your pallet from every angle and quickly understand the final arrangement.",
            },
            {
              title: "Optimization tools",
              description:
                "Try different layouts while considering available space and product dimensions.",
            },
            {
              title: "Layout validation",
              description:
                "Review important metrics before deciding on a final pallet configuration.",
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5"
            >
              <h3 className="font-medium text-white">{feature.title}</h3>

              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Mission */}
      <section className="rounded-3xl border border-slate-800/80 bg-slate-950/70 p-8 shadow-soft">
        <h2 className="text-xl font-semibold text-white">Our goal</h2>

        <p className="mt-4 max-w-3xl leading-relaxed text-slate-400">
          The goal of PalletFlow is to make pallet optimization easier to
          understand and easier to use. Instead of relying only on manual
          calculations, users can explore layouts visually and make better
          packing decisions.
        </p>
      </section>

      {/* Contact */}
      <section className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-7 shadow-soft">
        <h2 className="text-xl font-semibold text-white">Get in touch</h2>

        <p className="mt-3 text-slate-400">
          Have feedback, suggestions, or questions about PalletFlow? Feel free
          to reach out.
        </p>

        <div className="mt-4 space-y-2 text-slate-300">
          {/* <p>Email: support@palletflow.example</p>
          <p>Website: https://www.palletflow.example</p> */}
        </div>
      </section>
    </div>
  );
}
