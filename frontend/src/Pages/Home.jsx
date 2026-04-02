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
      image:
        "/images/slide1.jpg",
      title: "AI-Powered Career Guidance",
      subtitle: "Discover the best career path based on your skills and interests",
    },
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [slides.length]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
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

  return (
    <section id="home" className="relative w-full h-[500px] md:h-[600px] overflow-hidden">
      <img
        key={`hero-image-${current}`}
        src={slides[current].image}
        alt={slides[current].title}
        className="banner-image-reveal w-full h-full object-cover"
      />

      <div className="absolute inset-0 bg-gradient-to-r from-slate-950/70 via-slate-900/45 to-slate-900/20"></div>

      <div className="absolute inset-0 text-white">
        <div className="w-full px-6 md:px-10 lg:px-14 h-full flex flex-col justify-center">
          <span className="inline-flex w-fit mb-4 rounded-full bg-white/20 backdrop-blur px-4 py-1 text-xs md:text-sm font-medium text-emerald-100 border border-white/30">
            Career Intelligence Platform
          </span>
          <h1 key={`hero-title-${current}`} className="banner-title-reveal text-4xl md:text-6xl font-semibold leading-tight max-w-3xl">
            {slides[current].title}
          </h1>
          <p key={`hero-subtitle-${current}`} className="banner-subtitle-reveal text-base md:text-xl text-slate-100/95 mt-4 max-w-2xl">
            {slides[current].subtitle}
          </p>

          {!isLoggedIn && (
            <div className="mt-8">
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-7 py-3 rounded-xl font-semibold shadow-lg shadow-emerald-700/30 transition"
              >
                Get Started
              </button>
            </div>
          )}

          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl">
            <div className="rounded-xl bg-white/12 backdrop-blur px-4 py-3 border border-white/25">
              <p className="text-xs text-slate-200">Guidance Mode</p>
              <p className="font-semibold text-sm mt-1">AI Driven</p>
            </div>
            <div className="rounded-xl bg-white/12 backdrop-blur px-4 py-3 border border-white/25">
              <p className="text-xs text-slate-200">Skill Mapping</p>
              <p className="font-semibold text-sm mt-1">Real-time</p>
            </div>
            <div className="rounded-xl bg-white/12 backdrop-blur px-4 py-3 border border-white/25">
              <p className="text-xs text-slate-200">Suggestions</p>
              <p className="font-semibold text-sm mt-1">Personalized</p>
            </div>
            <div className="rounded-xl bg-white/12 backdrop-blur px-4 py-3 border border-white/25">
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
        </div>
      </div>

      {/* <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {slides.map((slide, i) => (
          <button
            type="button"
            key={slide.title}
            onClick={() => setCurrent(i)}
            aria-label={`Go to slide ${i + 1}`}
            className={`w-3 h-3 rounded-full cursor-pointer transition ${
              current === i ? "bg-green-500" : "bg-white/90"
            }`}
          />
        ))}
      </div> */}
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
    <section id="features" className="py-16 bg-gradient-to-b from-slate-50 to-white">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-semibold text-slate-900">Core Features</h2>
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
                {page.map((item) => (
                  <div
                    key={`${pageIndex}-${item.title}`}
                    className="relative w-80 h-64 rounded-2xl overflow-hidden cursor-pointer group border border-slate-200 shadow-md hover:shadow-xl transition"
                  >
                    <img
                      src={item.img}
                      alt={item.title}
                      className="w-full h-full object-cover brightness-110 group-hover:brightness-75 transition duration-500"
                    />

                    {/* Darken only on hover */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition duration-500"></div>

                    {/* Name on hover */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <p className="text-white font-semibold text-xl opacity-0 group-hover:opacity-100 transition duration-500 text-center px-3">
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
                activePage === i ? "w-8 bg-emerald-500" : "w-2.5 bg-slate-300"
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
    <section id="how" className="py-16 bg-slate-950">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl md:text-4xl font-semibold text-white">How It Works</h2>
          <p className="text-slate-300 mt-3">A simple guided flow from sign up to AI-generated career roadmap.</p>
        </div>

        <div className="pb-4 overflow-x-auto">
          <div className="mx-auto min-w-[1080px] max-w-7xl rounded-2xl overflow-hidden shadow-2xl shadow-black/40 flex border border-slate-700">
          {steps.map((step, i) => (
            <div
              key={i}
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
              className={`relative h-72 md:h-80 flex-1 cursor-pointer transition-all duration-500 ${
                hoveredIndex === i ? "z-10 scale-105" : "z-0"
              }`}
            >
              <img
                src={step.img}
                alt={step.title}
                className="w-full h-full object-cover"
              />

              {/* Dark for non-hovered cards, lighter for hovered */}
              <div
                className={`absolute inset-0 transition duration-500 ${
                  hoveredIndex === null
                    ? "bg-black/35"
                    : hoveredIndex === i
                    ? "bg-black/10"
                    : "bg-black/55"
                }`}
              ></div>

              {/* Number */}
              <div className="absolute top-3 left-3 bg-emerald-500 text-white w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium shadow">
                {i + 1}
              </div>

              {/* Full-size transparent title box */}
              <div
                className={`absolute inset-0 flex items-end justify-center pb-4 text-center transition duration-500 ${
                  hoveredIndex === i
                    ? "bg-white/24 text-black"
                    : "bg-white/8 text-white"
                }`}
              >
                <p className="text-sm md:text-base font-semibold px-3 py-2 rounded-md bg-black/20 backdrop-blur-sm">
                  {step.title}
                </p>
              </div>
            </div>
          ))}
        </div>
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
    <section id="stories" className="py-16 bg-gradient-to-b from-white to-slate-100">
      <div className="mx-auto max-w-7xl px-6">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-semibold text-slate-900">Success Stories</h2>
          <p className="text-slate-600 mt-3">See how learners used the platform to start focused career journeys.</p>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stories.map((story, i) => (
          <div
            key={i}
            className="bg-white p-7 rounded-2xl shadow-md border border-slate-200/80 hover:shadow-xl hover:-translate-y-1 transition duration-300"
          >
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
    <footer className="bg-slate-950 text-slate-300 py-10 border-t border-slate-800">
      <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <p className="text-white font-semibold">NextStep IT</p>
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

  useEffect(() => {
    const userData = localStorage.getItem("user");
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
    const token = localStorage.getItem("token");
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

  const isStudent = currentUser?.user_role === "STUDENT";

  return (
    <>
      <CommonHeader />
      <Hero />
      <Features />
      <HowItWorks />
      <SuccessStories />
      <Footer />

      {/* Chatbot Icon - Fixed Position (Only for Students) */}
      {isStudent && (
        <>
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
