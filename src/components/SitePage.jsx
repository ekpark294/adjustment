import { siteContent } from "../data/siteContent";

function PageSection({ section }) {
  return (
    <div className="site-section">
      <h2>{section.title}</h2>
      <p>{section.body}</p>
      {section.after}
    </div>
  );
}

function SitePage({ type, onHome }) {
  const content = siteContent[type] || siteContent.guide;

  return (
    <section className="page site-page">
      <button className="back" onClick={onHome} type="button">
        한입정산으로 돌아가기
      </button>
      <p className="eyebrow">{content.eyebrow}</p>
      <h1>{content.title}</h1>
      {content.lead ? <p className="lead">{content.lead}</p> : null}
      {content.orderedList ? (
        <div className="site-section">
          <h2>{content.orderedList.title}</h2>
          <ol>
            {content.orderedList.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ol>
        </div>
      ) : null}
      {content.cards ? (
        <div className="site-grid">
          {content.cards.map((card) => (
            <article key={card.title}>
              <h2>{card.title}</h2>
              <p>{card.body}</p>
            </article>
          ))}
        </div>
      ) : null}
      {content.sections.map((section) => (
        <PageSection key={section.title} section={section} />
      ))}
    </section>
  );
}

export default SitePage;
