import Settings from '../Settings';

const demoUser = { id: "demo", email: "demo@example.com", createdAt: null };

export default function SettingsExample() {
  return (
    <div className="p-4 max-w-2xl mx-auto">
      <Settings user={demoUser} />
    </div>
  );
}
