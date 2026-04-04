import React from "react";

/**
 * LearningRoadmap Component
 * Visually displays the career path progression with levels and milestones
 */
export function LearningRoadmap({ careerPath, masteryLevel = "Beginner", certificatesCount = 0 }) {
  const learningLevels = ["Beginner", "Intermediate", "Advanced", "Master"];
  const currentLevelIndex = learningLevels.indexOf(masteryLevel);

  const roadmapStages = [
    {
      level: "Beginner",
      title: "Foundation",
      description: "Start your journey with core concepts",
      courses: 3,
      icon: "🌱",
      skills: ["Basic concepts", "Setup & tools", "First project"],
      color: "from-blue-400 to-blue-600",
    },
    {
      level: "Intermediate",
      title: "Growth",
      description: "Build practical skills and real projects",
      courses: 5,
      icon: "📈",
      skills: ["Advanced patterns", "Complex projects", "Best practices"],
      color: "from-purple-400 to-purple-600",
    },
    {
      level: "Advanced",
      title: "Excellence",
      description: "Master complex concepts and lead projects",
      courses: 4,
      icon: "⭐",
      skills: ["Architecture", "Optimization", "Mentoring"],
      color: "from-pink-400 to-rose-600",
    },
    {
      level: "Master",
      title: "Expert",
      description: "Become a recognized expert in your field",
      courses: 2,
      icon: "👑",
      skills: ["Industry leadership", "Innovation", "Speaking"],
      color: "from-yellow-400 to-orange-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Career Path Header */}
      <div className="glass-panel p-6 rounded-2xl bg-gradient-to-r from-indigo-50 to-purple-50 border-l-4 border-indigo-500">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{careerPath}</h3>
            <p className="text-sm text-slate-600 mt-1">Your personalized learning journey</p>
          </div>
          <div className="text-4xl">🎯</div>
        </div>
      </div>

      {/* Current Progress Indicator */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {learningLevels.map((level, idx) => {
          const isCompleted = idx < currentLevelIndex;
          const isCurrent = idx === currentLevelIndex;

          return (
            <div
              key={level}
              className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                isCompleted
                  ? "border-emerald-400 bg-emerald-50"
                  : isCurrent
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                    : "border-gray-200 bg-gray-50"
              }`}
            >
              <div className="text-sm font-semibold">{level}</div>
              <div className="text-2xl mt-2">
                {isCompleted && "✓"}
                {isCurrent && "→"}
                {!isCompleted && !isCurrent && "○"}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Roadmap Timeline */}
      <div className="space-y-4">
        {roadmapStages.map((stage, index) => {
          const isCompleted = index < currentLevelIndex;
          const isCurrent = index === currentLevelIndex;
          const isLocked = index > currentLevelIndex;

          return (
            <div
              key={stage.level}
              className={`relative ${isLocked ? "opacity-60" : ""}`}
            >
              {/* Connection Line */}
              {index < roadmapStages.length - 1 && (
                <div
                  className={`absolute left-8 top-20 w-1 h-12 -ml-0.5 ${
                    isCompleted ? "bg-emerald-500" : isLocked ? "bg-gray-300" : "bg-indigo-300"
                  }`}
                ></div>
              )}

              {/* Stage Card */}
              <div
                className={`relative glass-panel rounded-2xl p-6 border-l-4 transition-all duration-300 hover:shadow-lg ${
                  isCompleted
                    ? "border-l-emerald-500 bg-emerald-50/50"
                    : isCurrent
                      ? "border-l-blue-500 bg-blue-50/70 ring-2 ring-blue-200"
                      : "border-l-gray-300 bg-gray-50/50"
                }`}
              >
                <div className="flex items-start gap-4">
                  {/* Icon Circle */}
                  <div
                    className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                      isCompleted
                        ? "bg-emerald-200 text-emerald-700"
                        : isCurrent
                          ? "bg-gradient-to-br " + stage.color + " text-white animate-pulse"
                          : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {stage.icon}
                  </div>

                  <div className="flex-1">
                    {/* Stage Header */}
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-lg font-bold text-slate-900">{stage.title}</h4>
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-200 text-slate-700">
                        {stage.level}
                      </span>
                      {isCurrent && (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-200 text-blue-700 animate-pulse">
                          Current
                        </span>
                      )}
                      {isCompleted && (
                        <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-200 text-emerald-700">
                          Completed ✓
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-slate-600 mb-4">{stage.description}</p>

                    {/* Skills Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                      {stage.skills.map((skill) => (
                        <div
                          key={skill}
                          className="bg-white/60 border border-slate-200 rounded-lg p-3 text-xs font-medium text-slate-700 flex items-center gap-2"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                          {skill}
                        </div>
                      ))}
                    </div>

                    {/* Course Count & Progress */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-orange-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm3.5 1a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm9 0a1.5 1.5 0 100 3 1.5 1.5 0 000-3zm1.5 6H2v-1h14v1z" />
                        </svg>
                        <span className="text-sm font-semibold text-slate-700">{stage.courses} Courses</span>
                      </div>
                      {!isLocked && (
                        <button
                          type="button"
                          disabled={isLocked}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                            isCompleted
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                              : isCurrent
                                ? "bg-blue-500 text-white hover:bg-blue-600"
                                : "bg-gray-200 text-gray-600 cursor-not-allowed"
                          }`}
                        >
                          {isCompleted ? "✓ Completed" : isCurrent ? "Start Learning" : "Locked"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Achievement Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-200 mt-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{currentLevelIndex + 1}</p>
          <p className="text-sm text-blue-700 font-medium mt-1">Current Level</p>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-purple-600">{certificatesCount}</p>
          <p className="text-sm text-purple-700 font-medium mt-1">Certificates Earned</p>
        </div>
        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-emerald-600">{Math.round((currentLevelIndex + 1) / 4 * 100)}%</p>
          <p className="text-sm text-emerald-700 font-medium mt-1">Path Progress</p>
        </div>
      </div>

      {/* Call to Action */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white text-center">
        <h4 className="text-lg font-bold mb-2">Ready to advance your skills?</h4>
        <p className="text-sm text-indigo-100 mb-4">
          {masteryLevel === "Master"
            ? "You've reached mastery! Share your knowledge with others."
            : "Continue learning to reach the next level and unlock new opportunities."}
        </p>
        <button className="bg-white text-indigo-600 font-semibold px-6 py-2 rounded-lg hover:bg-indigo-50 transition-colors">
          {masteryLevel === "Master" ? "Become a Mentor" : "View Courses"}
        </button>
      </div>
    </div>
  );
}
