import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import CommonHeader from "../components/CommonHeader";
import MessageModal from "../components/MessageModal";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8001";

// ================= HERO =================
function Hero() {
  const navigate = useNavigate();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const slides = [
    {
      image: "/images/p4.jpg",
      title: "AI-Powered Career Guidance",
      subtitle: "Discover the best career path based on your skills and interests",
    },
    {
      image: "/images/p3.jpg",
      title: "Skill-First Roadmaps For Real Jobs",
      subtitle: "Get a guided step-by-step plan tailored to your current level and your target career role",
    },
    {
      image: "/images/slide1.jpg",
      title: "Turn Learning Into Career Outcomes",
      subtitle: "Move from confusion to clarity with smart course suggestions, project ideas, and growth tracking",
    },
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const userData = sessionStorage.getItem("user");
    setIsLoggedIn(Boolean(token && userData));

    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch (err) {
        setCurrentUser(null);
      }
    }
  }, []);

  const completionPercentage = typeof currentUser?.profile_completion_percentage === "number"
    ? currentUser.profile_completion_percentage
    : null;
  const shouldShowStudentStatus = isLoggedIn && currentUser?.user_role === "STUDENT" && completionPercentage !== null;

  const goToPrev = () => {
    setCurrent((prev) => (prev - 1 + slides.length) % slides.length);
  };

  const goToNext = () => {
    setCurrent((prev) => (prev + 1) % slides.length);
  };

  return (
    <section id="home" className="relative w-full min-h-[670px] md:min-h-[720px] overflow-hidden home-hero-shell -mt-20">
      <img
        key={`hero-image-${current}`}
        src={slides[current].image}
        alt={slides[current].title}
        className="banner-image-reveal w-full h-full absolute inset-0 object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-[#1e293b]/85 via-[#0f172a]/60 to-[#111827]/35"></div>
      <div className="hero-noise-layer absolute inset-0"></div>
      <div className="home-hero-ribbon home-hero-ribbon-a"></div>
      <div className="home-hero-ribbon home-hero-ribbon-b"></div>

      <div className="absolute inset-0 text-white">
        <div className="w-full px-6 md:px-10 lg:px-14 h-full flex flex-col justify-center">
          <span className="inline-flex w-fit mb-4 rounded-full bg-amber-100/20 backdrop-blur px-4 py-1 text-xs md:text-sm font-semibold text-amber-100 border border-amber-100/35 shadow-xl shadow-amber-500/20">
            Career Intelligence Platform
          </span>
          <h1 key={`hero-title-${current}`} className="banner-title-reveal text-4xl md:text-6xl font-semibold leading-tight max-w-3xl">
            {slides[current].title}
          </h1>
          <p key={`hero-subtitle-${current}`} className="banner-subtitle-reveal text-base md:text-xl text-slate-100/95 mt-4 max-w-2xl">
            {slides[current].subtitle}
          </p>

          {!isLoggedIn && (
            <div className="mt-8 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="bg-emerald-500 hover:bg-emerald-400 text-white px-7 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-700/30 transition"
              >
                Get Started
              </button>
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="px-6 py-3 rounded-xl font-semibold border border-emerald-200/55 bg-emerald-700/35 hover:bg-emerald-700/50 backdrop-blur transition"
              >
                Join For Free
              </button>
            </div>
          )}

          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
            <div className="home-stat-card rounded-xl bg-white/12 backdrop-blur px-4 py-3 border border-white/25">
              <p className="text-xs text-slate-200">Guidance Mode</p>
              <p className="font-semibold text-sm mt-1">AI Driven</p>
            </div>
            <div className="home-stat-card rounded-xl bg-white/12 backdrop-blur px-4 py-3 border border-white/25">
              <p className="text-xs text-slate-200">Skill Mapping</p>
              <p className="font-semibold text-sm mt-1">Real-time</p>
            </div>
            <div className="home-stat-card rounded-xl bg-white/12 backdrop-blur px-4 py-3 border border-white/25">
              <p className="text-xs text-slate-200">Suggestions</p>
              <p className="font-semibold text-sm mt-1">Personalized</p>
            </div>
            <div className="home-stat-card rounded-xl bg-white/12 backdrop-blur px-4 py-3 border border-white/25">
              <p className="text-xs text-slate-200">Outcome</p>
              <p className="font-semibold text-sm mt-1">Career Path</p>
            </div>
          </div>

          {shouldShowStudentStatus && (
            <div className="mt-6 w-full max-w-xl rounded-2xl border border-white/30 bg-white/15 backdrop-blur p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-100">Student Progress</p>
                  <p className="text-lg font-semibold text-white">Profile Completion: {completionPercentage}%</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/profile")}
                  className="rounded-lg bg-white text-emerald-700 px-4 py-2 text-sm font-semibold hover:bg-emerald-50 transition"
                >
                  Complete Profile
                </button>
              </div>
              <div className="mt-3 h-2 w-full rounded-full bg-white/30 overflow-hidden">
                <div className="h-2 rounded-full bg-emerald-400" style={{ width: `${completionPercentage}%` }} />
              </div>
            </div>
          )}

          <div className="mt-8 flex items-center gap-2">
            {slides.map((slide, i) => (
              <button
                key={slide.title}
                type="button"
                onClick={() => setCurrent(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  current === i ? "w-12 bg-amber-400" : "w-6 bg-white/55 hover:bg-white/80"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={goToPrev}
        aria-label="Previous banner"
        className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 w-10 h-10 md:w-11 md:h-11 rounded-full bg-black/30 border border-white/35 text-white hover:bg-black/45 backdrop-blur flex items-center justify-center transition"
      >
        &#10094;
      </button>

      <button
        type="button"
        onClick={goToNext}
        aria-label="Next banner"
        className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 w-10 h-10 md:w-11 md:h-11 rounded-full bg-black/30 border border-white/35 text-white hover:bg-black/45 backdrop-blur flex items-center justify-center transition"
      >
        &#10095;
      </button>
    </section>
  );
}

// ================= FEATURES =================
function Features() {
  const [activePage, setActivePage] = useState(0);
  const data = [
    { title: "AI Career Recommendations", img: "/images/feature1.png" },
    { title: "Skill Analysis", img: "/images/feature2.png" },
    { title: "Course Suggestions", img: "/images/feature3.png" },
    { title: "Real-time Insights", img: "/images/feature4.png" },
    { title: "Personal Dashboard", img: "/images/feature5.png" },
  ];
  const featurePages = [data.slice(0, 3), data.slice(2, 5)];

  return (
    <section id="features" className="py-0 bg-gradient-to-b from-amber-50 via-rose-50/40 to-sky-50/80 home-feature-weave">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-8">
          
          <h2 className="text-3xl md:text-4xl font-semibold text-slate-900 mt-4">Core Features</h2>
          <p className="text-slate-600 mt-3">Modern tools to map your skills to the right career direction.</p>
        </div>

        <div className="overflow-hidden pb-2">
          <div className="mx-auto max-w-7xl overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${activePage * 100}%)` }}
          >
            {featurePages.map((page, pageIndex) => (
              <div key={pageIndex} className="min-w-full grid grid-cols-1 md:grid-cols-3 gap-8 place-items-center">
                {page.map((item, itemIndex) => (
                  <div
                    key={`${pageIndex}-${item.title}`}
                    className="relative w-80 h-64 rounded-2xl overflow-hidden cursor-pointer group border border-rose-200/70 shadow-lg shadow-rose-200/45 hover:shadow-xl hover:-translate-y-1 transition duration-300"
                  >
                    <img
                      src={item.img}
                      alt={item.title}
                      className="w-full h-full object-cover brightness-110 group-hover:scale-110 group-hover:brightness-90 transition duration-500"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-[#4c1d95]/75 via-[#0f172a]/10 to-transparent opacity-80 group-hover:opacity-100 transition duration-500"></div>

                    <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-amber-100/90 text-rose-900 font-semibold text-sm flex items-center justify-center backdrop-blur">
                      {pageIndex * 3 + itemIndex + 1}
                    </div>

                    <div className="absolute inset-0 flex items-end justify-start p-4">
                      <p className="text-white font-semibold text-lg md:text-xl opacity-90 group-hover:opacity-100 transition duration-500 text-left max-w-[90%] leading-snug">
                        {item.title}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
        </div>

        <div className="flex justify-center gap-2 mt-4">
          {featurePages.map((_, i) => (
            <button
              type="button"
              key={`feature-dot-${i}`}
              onClick={() => setActivePage(i)}
              aria-label={`Show feature group ${i + 1}`}
              className={`h-2.5 rounded-full cursor-pointer transition-all duration-300 ${
                activePage === i ? "w-8 bg-rose-600" : "w-2.5 bg-rose-300"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ================= HOW IT WORKS =================
function HowItWorks() {
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const steps = [
    { title: "Sign Up & Login", img: "/images/howit1.png" },
    { title: "Enter Your Skills", img: "/images/howit2.png" },
    { title: "AI Analyzes Data", img: "/images/p3.jpg" },
    { title: "Get Career Path", img: "/images/p4.jpg" },
  ];

  return (
    <section id="how" className="py-20 mt-5 bg-gradient-to-b from-[#111827] to-[#1f2937] relative overflow-hidden">
      <div className="absolute -top-28 -left-20 w-72 h-72 rounded-full bg-amber-300/15 blur-3xl"></div>
      <div className="absolute -bottom-28 -right-20 w-80 h-80 rounded-full bg-rose-400/15 blur-3xl"></div>
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-8">
          <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase bg-amber-200/15 text-amber-100 border border-amber-100/30">Your Journey</span>
          <h2 className="text-3xl md:text-4xl font-semibold text-white">How It Works</h2>
          <p className="text-slate-300 mt-3">A simple guided flow from sign up to AI-generated career roadmap.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((step, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`relative h-72 rounded-2xl overflow-hidden cursor-pointer border border-white/15 transition-all duration-500 ${
                hoveredIndex === i ? "scale-[1.02] shadow-2xl shadow-amber-500/25" : "shadow-lg shadow-black/25"
              }`}
            >
              <img
                src={step.img}
                alt={step.title}
                className="w-full h-full object-cover transition duration-500 group-hover:scale-105"
              />

              <div
                className={`absolute inset-0 transition duration-500 ${
                  hoveredIndex === null
                    ? "bg-black/45"
                    : hoveredIndex === i
                    ? "bg-black/20"
                    : "bg-black/60"
                }`}
              ></div>

              <div className="absolute top-3 left-3 bg-amber-400 text-slate-900 w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium shadow-lg shadow-amber-700/40">
                {i + 1}
              </div>

              <div
                className={`absolute inset-0 flex items-end justify-center pb-4 text-center transition duration-500 ${
                  hoveredIndex === i
                    ? "bg-white/20 text-black"
                    : "bg-white/5 text-white"
                }`}
              >
                <p className="text-sm md:text-base font-semibold px-3 py-2 rounded-md bg-black/25 backdrop-blur-sm">
                  {step.title}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ================= SUCCESS STORIES =================
function SuccessStories() {
  const stories = [
    {
      text: "I was confused about my career after my IT degree. This platform analyzed my skills and recommended Software Engineering. Today, I work as a junior developer.",
      name: "Jane Smith",
    },
    {
      text: "I always loved design but didn't know it could be a career. The system suggested UI/UX design. Now I work as a freelance UI designer.",
      name: "Alex Cott",
    },
    {
      text: "The platform helped me discover my interest in data analysis. Now I have completed internships and started my journey as a data analyst.",
      name: "Peter Parker",
    },
  ];

  return (
    <section id="stories" className="py-20 bg-gradient-to-b from-amber-50/70 via-white to-rose-50/70">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-10">
          <span className="inline-flex rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase bg-rose-100 text-rose-700">Community Voices</span>
          <h2 className="text-3xl md:text-4xl font-semibold text-slate-900">Success Stories</h2>
          <p className="text-slate-600 mt-3">See how learners used the platform to start focused career journeys.</p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stories.map((story, i) => (
          <div
            key={i}
            className="relative bg-white/90 backdrop-blur p-7 rounded-2xl shadow-lg border border-rose-200/70 hover:shadow-xl hover:-translate-y-1 transition duration-300 overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-100/90 to-transparent rounded-bl-full"></div>
            <p className="text-3xl text-rose-500 font-serif leading-none">“</p>
            <p className="text-sm text-slate-600 leading-6 mb-5">
              "{story.text}"
            </p>
            <h4 className="text-sm font-semibold text-slate-800">{story.name}</h4>
            <p className="text-xs text-slate-500 mt-1">Platform Learner</p>
          </div>
        ))}
      </div>
      </div>
    </section>
  );
}

// ================= FOOTER =================
function Footer() {
  return (
    <footer className="bg-[#1f2937] text-slate-300 py-12 border-t border-slate-700/80 relative overflow-hidden">
      <div className="absolute -top-24 -right-16 w-56 h-56 rounded-full bg-rose-500/15 blur-3xl"></div>
      <div className="absolute -bottom-20 -left-20 w-56 h-56 rounded-full bg-amber-500/15 blur-3xl"></div>
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-white font-semibold text-lg">NextStep IT</p>
          <p className="text-sm text-slate-400 mt-1">AI-powered pathway planning for modern careers.</p>
        </div>
        <p className="text-sm">© 2026 Smart Career Pathway System</p>
      </div>
    </footer>
  );
}

// ================= APP =================
export default function HomePage() {
  const location = useLocation();
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [studentUnreadCount, setStudentUnreadCount] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    const userData = sessionStorage.getItem("user");
    if (userData) {
      try {
        setCurrentUser(JSON.parse(userData));
      } catch {
        setCurrentUser(null);
      }
    }
  }, []);

  // Poll for unread message replies if user is a student
  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const isStudent = currentUser?.user_role === "STUDENT";
    
    if (!token || !isStudent) {
      setStudentUnreadCount(0);
      return;
    }

    const loadUnreadCount = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/messages/my-unread-count`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setStudentUnreadCount(data.unreadCount || 0);
        }
      } catch (error) {
        console.error("Error loading unread count:", error);
      }
    };

    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [currentUser]);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const sectionId = location.hash.replace("#", "");
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [location.hash]);

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 220);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isStudent = currentUser?.user_role === "STUDENT";

  return (
    <>
      <CommonHeader />
      <main className="home-page-wrap">
        <Hero />
        <Features />
        <HowItWorks />
        <SuccessStories />
        <Footer />
      </main>

      {/* Chatbot Icon - Fixed Position (Only for Students) */}
      {isStudent && (
        <>
          {showScrollTop && (
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="fixed bottom-24 right-8 w-12 h-12 rounded-full transition-all flex items-center justify-center z-40 scroll-top-fab"
              title="Go to top"
              aria-label="Go to top"
            >
              <span className="scroll-top-fab-icon">&#8593;</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsMessageModalOpen(true)}
            className="fixed bottom-8 right-8 w-14 h-14 bg-gradient-to-br from-orange-600 to-orange-500 rounded-full shadow-lg hover:shadow-xl hover:scale-110 transition-all flex items-center justify-center text-white z-40"
            title="Chat with admin"
          >
            <img src="/Images/message.png" alt="Chat" className="w-7 h-7 object-contain" />
            {studentUnreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center">
                {studentUnreadCount > 9 ? "9+" : studentUnreadCount}
              </span>
            )}
          </button>

          {/* Message Modal */}
          <MessageModal isOpen={isMessageModalOpen} onClose={() => setIsMessageModalOpen(false)} user={currentUser} />
        </>
      )}
    </>
  );
}
