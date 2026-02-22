interface PageHeaderProps {
  title: string;
  description: string;
}

export default function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <header className="page-head page-enter">
      <h1>{title}</h1>
      <p>{description}</p>
    </header>
  );
}
