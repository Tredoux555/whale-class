import { areas, getCurriculumStats } from '@/lib/curriculum'

export default function Home() {
  const stats = getCurriculumStats()

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4 text-montessori-brown">
          Montessori Tree 🌳
        </h1>
        <p className="text-lg mb-8 text-gray-700">
          Interactive Montessori curriculum visualization
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-2">Areas</h2>
            <p className="text-4xl font-bold text-montessori-brown">
              {stats.totalAreas}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-2">Works</h2>
            <p className="text-4xl font-bold text-montessori-brown">
              {stats.totalWorks}
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-2">Levels</h2>
            <p className="text-4xl font-bold text-montessori-brown">
              {stats.totalLevels}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-semibold mb-4">Curriculum Areas</h2>
          <div className="space-y-4">
            {areas.map((area) => (
              <div
                key={area.id}
                className="border-l-4 pl-4"
                style={{ borderColor: area.color }}
              >
                <h3 className="text-xl font-semibold">{area.name}</h3>
                <p className="text-gray-600 mb-2">{area.description}</p>
                <div className="text-sm text-gray-500">
                  {area.categories.length} categories •{' '}
                  {area.categories.reduce(
                    (sum, cat) => sum + cat.works.length,
                    0
                  )}{' '}
                  works
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  )
}

