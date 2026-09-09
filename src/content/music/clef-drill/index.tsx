import { useState, useEffect, useCallback, useRef } from "react";

// BASS CLEF: position 0 = bottom staff line (G), each +1 = one step up (line or space)
// Bottom line=G, space=A, line=B, space=C, line=D, space=E, line=F, space=G, line=A
const BASS_NOTES = [
  { name: "C", pos: -4 },  // 2nd ledger line below
  { name: "D", pos: -3 },  // space below 1st ledger line
  { name: "E", pos: -2 },  // 1st ledger line below
  { name: "F", pos: -1 },  // space below bottom line
  { name: "G", pos: 0 },   // bottom line (1st line)
  { name: "A", pos: 1 },   // 1st space
  { name: "B", pos: 2 },   // 2nd line
  { name: "C", pos: 3 },   // 2nd space
  { name: "D", pos: 4 },   // 3rd line (middle)
  { name: "E", pos: 5 },   // 3rd space
  { name: "F", pos: 6 },   // 4th line
  { name: "G", pos: 7 },   // 4th space
  { name: "A", pos: 8 },   // 5th line (top)
  { name: "B", pos: 9 },   // space above top line
  { name: "C", pos: 10 },  // 1st ledger line above
  { name: "D", pos: 11 },  // space above 1st ledger line
  { name: "E", pos: 12 },  // 2nd ledger line above
  { name: "F", pos: 13 },  // space above 2nd ledger line
];

// TREBLE CLEF: position 0 = bottom staff line (E), each +1 = one step up (line or space)
// Bottom line=E, space=F, line=G, space=A, line=B, space=C, line=D, space=E, line=F
const TREBLE_NOTES = [
  { name: "A", pos: -4 },  // 2nd ledger line below
  { name: "B", pos: -3 },  // space below 1st ledger line
  { name: "C", pos: -2 },  // 1st ledger line below
  { name: "D", pos: -1 },  // space below bottom line
  { name: "E", pos: 0 },   // bottom line (1st line)
  { name: "F", pos: 1 },   // 1st space
  { name: "G", pos: 2 },   // 2nd line
  { name: "A", pos: 3 },   // 2nd space
  { name: "B", pos: 4 },   // 3rd line (middle)
  { name: "C", pos: 5 },   // 3rd space
  { name: "D", pos: 6 },   // 4th line
  { name: "E", pos: 7 },   // 4th space
  { name: "F", pos: 8 },   // 5th line (top)
  { name: "G", pos: 9 },   // space above top line
  { name: "A", pos: 10 },  // 1st ledger line above
  { name: "B", pos: 11 },  // space above 1st ledger line
  { name: "C", pos: 12 },  // 2nd ledger line above
  { name: "D", pos: 13 },  // space above 2nd ledger line
];

const LINE_SPACING = 16;
const STAFF_TOP = 60;
const STAFF_LEFT = 80;
const STAFF_WIDTH = 260;
const NOTE_X = STAFF_LEFT + STAFF_WIDTH / 2 + 30;

function getStaffY(pos) {
  // Bottom staff line (pos 0) is at STAFF_TOP + 4 * LINE_SPACING
  const bottomLineY = STAFF_TOP + 4 * LINE_SPACING;
  return bottomLineY - pos * (LINE_SPACING / 2);
}

function pickRandomNote(notes, exclude, stats = {}, clef = "bass") {
  // Calculate weights based on performance
  const noteWeights = notes.map(note => {
    // Look up stats for this specific note+clef combination
    const statsKey = `${note.name}-${clef}`;
    const noteStat = stats[statsKey];
    if (!noteStat || (noteStat.correct + noteStat.wrong) < 3) {
      // Not enough data, use default weight
      return { note, weight: 1 };
    }

    // Calculate accuracy for this note
    const accuracy = noteStat.correct / (noteStat.correct + noteStat.wrong);

    // Weight inversely proportional to accuracy
    // Notes with 50% accuracy get 2x weight, 25% get 4x weight, etc.
    // But cap the weight to avoid too much skew
    const weight = Math.min(5, 1 / Math.max(0.3, accuracy));

    return { note, weight };
  });

  // Filter out the excluded note
  const availableWeights = noteWeights.filter(
    nw => !(exclude && nw.note.name === exclude.name && nw.note.pos === exclude.pos)
  );

  // Calculate total weight
  const totalWeight = availableWeights.reduce((sum, nw) => sum + nw.weight, 0);

  // Pick a random value in the weight range
  let random = Math.random() * totalWeight;

  // Find the note that corresponds to this random value
  for (const nw of availableWeights) {
    random -= nw.weight;
    if (random <= 0) {
      return nw.note;
    }
  }

  // Fallback (shouldn't happen)
  return availableWeights[availableWeights.length - 1].note;
}

const TICK = 50;

export default function ClefDrill() {
  const [selectedClefs, setSelectedClefs] = useState(["bass"]);
  const [selectedRanges, setSelectedRanges] = useState(["low", "center", "high"]);
  const [gameState, setGameState] = useState("idle");
  const [isPaused, setIsPaused] = useState(false);
  const [currentNote, setCurrentNote] = useState(null);
  const [currentClef, setCurrentClef] = useState("bass");
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [stats, setStats] = useState({});
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [recentTimes, setRecentTimes] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const [isGolden, setIsGolden] = useState(false);
  const roundStartRef = useRef(null);
  const timerRef = useRef(null);
  const feedbackTimeoutRef = useRef(null);

  const startRound = useCallback(
    (prevNote) => {
      // Pick random clef from selected clefs
      const randomClef = selectedClefs[Math.floor(Math.random() * selectedClefs.length)];
      setCurrentClef(randomClef);

      const allNotes = randomClef === "bass" ? BASS_NOTES : TREBLE_NOTES;
      // Filter by selected ranges:
      // low = pos -4..0 (ledger lines below through bottom staff line)
      // center = pos 1..7 (bottom space through top space, within staff)
      // high = pos 8..13 (top staff line through ledger lines above)
      const notes = allNotes.filter(n => {
        if (selectedRanges.includes("low") && n.pos >= -4 && n.pos <= 0) return true;
        if (selectedRanges.includes("center") && n.pos >= 1 && n.pos <= 7) return true;
        if (selectedRanges.includes("high") && n.pos >= 8 && n.pos <= 13) return true;
        return false;
      });
      const note = pickRandomNote(notes, prevNote, stats, randomClef);
      setCurrentNote(note);
      setFeedback(null);
      setElapsed(0);
      roundStartRef.current = Date.now();
      setGameState("playing");
      
      // Make note golden every 50 rounds
      if (totalAnswered > 0 && totalAnswered % 50 === 0) {
        setIsGolden(true);
      } else {
        setIsGolden(false);
      }
    },
    [selectedClefs, selectedRanges, totalAnswered, stats]
  );

  const startGame = () => {
    setStreak(0);
    setStats({});
    setTotalAnswered(0);
    setTotalCorrect(0);
    setRecentTimes([]);
    setElapsed(0);
    setIsPaused(false);
    setIsGolden(false);
    startRound(null);
  };

  const goToIdle = () => {
    setGameState("idle");
    setIsPaused(false);
    clearInterval(timerRef.current);
    clearTimeout(feedbackTimeoutRef.current);
  };

  const togglePause = () => {
    if (isPaused) {
      // Resuming - adjust the start time to account for paused duration
      const pausedDuration = Date.now() - roundStartRef.current - elapsed;
      roundStartRef.current = Date.now() - elapsed;
    }
    setIsPaused(!isPaused);
  };

  const handleClefChange = (clefType) => {
    if (selectedClefs.includes(clefType)) {
      // Deselect if already selected (but keep at least one selected)
      if (selectedClefs.length > 1) {
        const newClefs = selectedClefs.filter(c => c !== clefType);
        setSelectedClefs(newClefs);
        // If we're playing and the current clef was deselected, start new round
        if ((gameState === "playing" || gameState === "feedback") && currentClef === clefType) {
          startRound(null);
        }
      }
    } else {
      // Select
      setSelectedClefs([...selectedClefs, clefType]);
    }
  };

  const handleRangeChange = (range) => {
    if (selectedRanges.includes(range)) {
      if (selectedRanges.length > 1) {
        setSelectedRanges(selectedRanges.filter(r => r !== range));
      }
    } else {
      setSelectedRanges([...selectedRanges, range]);
    }
  };

  // Elapsed time counter (just for display, no pressure)
  useEffect(() => {
    if (gameState !== "playing" || isPaused) {
      clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setElapsed(Date.now() - roundStartRef.current);
    }, TICK);
    return () => clearInterval(timerRef.current);
  }, [gameState, isPaused]);

  useEffect(() => {
    if (gameState === "feedback") {
      feedbackTimeoutRef.current = setTimeout(() => {
        startRound(currentNote);
      }, 1000);
    }
    return () => clearTimeout(feedbackTimeoutRef.current);
  }, [gameState, currentNote, startRound]);

  const handleAnswer = (noteName) => {
    if (gameState !== "playing" || isPaused) return;
    clearInterval(timerRef.current);
    const responseTime = Date.now() - roundStartRef.current;
    const correct = noteName === currentNote.name;
    setFeedback({ correct, timeout: false, time: responseTime });
    setGameState("feedback");
    setTotalAnswered((t) => t + 1);

    if (correct) {
      setTotalCorrect((t) => t + 1);
      setRecentTimes((prev) => [...prev.slice(-9), responseTime]);
      setStreak((s) => {
        const next = s + 1;
        setBestStreak((b) => Math.max(b, next));
        return next;
      });
    } else {
      setStreak(0);
    }
    setStats((s) => {
      // Track note+clef combination
      const key = `${currentNote.name}-${currentClef}`;
      const prev = s[key] || { correct: 0, wrong: 0 };
      return {
        ...s,
        [key]: {
          correct: prev.correct + (correct ? 1 : 0),
          wrong: prev.wrong + (correct ? 0 : 1),
        },
      };
    });
  };

  useEffect(() => {
    if (gameState !== "playing" || isPaused) return;
    const handler = (e) => {
      const key = e.key.toUpperCase();
      if ("ABCDEFG".includes(key)) {
        handleAnswer(key);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameState, currentNote, isPaused]);

  const avgTime = recentTimes.length > 0
    ? recentTimes.reduce((a, b) => a + b, 0) / recentTimes.length
    : 0;

  const noteButtons = ["C", "D", "E", "F", "G", "A", "B"];

  const clefButtonsJSX = (
    <>
      <button
        onClick={() => handleClefChange("bass")}
        style={{
          background: selectedClefs.includes("bass") ? "#2a2a4a" : "none",
          border: "1px solid #4a4a7a",
          color: selectedClefs.includes("bass") ? "#e0e0f0" : "#8888aa",
          padding: "12px",
          fontSize: "42px",
          cursor: "pointer",
          transition: "all 0.2s",
          fontFamily: "serif",
          width: "70px",
          height: "70px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => {
          e.target.style.borderColor = "#8080c0";
          if (!selectedClefs.includes("bass")) e.target.style.color = "#b0b0d0";
        }}
        onMouseLeave={(e) => {
          e.target.style.borderColor = "#4a4a7a";
          e.target.style.color = selectedClefs.includes("bass") ? "#e0e0f0" : "#8888aa";
        }}
      >
        𝄢
      </button>
      <button
        onClick={() => handleClefChange("treble")}
        style={{
          background: selectedClefs.includes("treble") ? "#2a2a4a" : "none",
          border: "1px solid #4a4a7a",
          color: selectedClefs.includes("treble") ? "#e0e0f0" : "#8888aa",
          padding: "12px",
          fontSize: "52px",
          cursor: "pointer",
          transition: "all 0.2s",
          fontFamily: "serif",
          width: "70px",
          height: "70px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        onMouseEnter={(e) => {
          e.target.style.borderColor = "#8080c0";
          if (!selectedClefs.includes("treble")) e.target.style.color = "#b0b0d0";
        }}
        onMouseLeave={(e) => {
          e.target.style.borderColor = "#4a4a7a";
          e.target.style.color = selectedClefs.includes("treble") ? "#e0e0f0" : "#8888aa";
        }}
      >
        𝄞
      </button>
    </>
  );

  const rangeButtonsJSX = (
    <>
      {[
        { key: "low", label: "Low" },
        { key: "center", label: "Mid" },
        { key: "high", label: "High" },
      ].map(({ key, label }) => (
        <button
          key={key}
          onClick={() => handleRangeChange(key)}
          style={{
            background: selectedRanges.includes(key) ? "#2a2a4a" : "none",
            border: "1px solid #4a4a7a",
            color: selectedRanges.includes(key) ? "#e0e0f0" : "#8888aa",
            padding: "6px 10px",
            fontSize: "10px",
            letterSpacing: "2px",
            textTransform: "uppercase",
            cursor: "pointer",
            transition: "all 0.2s",
            fontFamily: "inherit",
            whiteSpace: "nowrap",
          }}
          onMouseEnter={(e) => {
            e.target.style.borderColor = "#8080c0";
            if (!selectedRanges.includes(key)) e.target.style.color = "#b0b0d0";
          }}
          onMouseLeave={(e) => {
            e.target.style.borderColor = "#4a4a7a";
            e.target.style.color = selectedRanges.includes(key) ? "#e0e0f0" : "#8888aa";
          }}
        >
          {label}
        </button>
      ))}
    </>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#1a1a2e",
        color: "#e0e0e0",
        fontFamily: "'JetBrains Mono', 'Fira Code', 'SF Mono', monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        userSelect: "none",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          letterSpacing: "4px",
          textTransform: "uppercase",
          color: "#6a6a9a",
          marginBottom: "8px",
        }}
      >
        {gameState === "idle" && (
          <>{selectedClefs.length === 1
            ? (selectedClefs[0] === "bass" ? "Bass" : "Treble") + " Clef Drill"
            : "Multi-Clef Drill"}</>
        )}
      </div>

      {gameState !== "idle" && (
        <div
          style={{
            position: "fixed",
            // clear the platform's sticky "← All drills" bar (~41px tall)
            top: "56px",
            left: "20px",
            right: "20px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          {/* Back button */}
          <button
            onClick={goToIdle}
            style={{
              background: "none",
              border: "1px solid #4a4a7a",
              color: "#8888aa",
              width: "40px",
              height: "40px",
              fontSize: "18px",
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = "#8080c0";
              e.target.style.color = "#b0b0d0";
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = "#4a4a7a";
              e.target.style.color = "#8888aa";
            }}
          >
            ←
          </button>

          {/* Title */}
          <div
            style={{
              fontSize: "11px",
              letterSpacing: "4px",
              textTransform: "uppercase",
              color: "#6a6a9a",
            }}
          >
            {selectedClefs.length === 1 
              ? (selectedClefs[0] === "bass" ? "Bass" : "Treble") + " Clef Drill"
              : "Multi-Clef Drill"}
          </div>

          {/* Pause/Play button */}
          <button
            onClick={togglePause}
            style={{
              background: "none",
              border: "1px solid #4a4a7a",
              color: "#8888aa",
              width: "40px",
              height: "40px",
              fontSize: "16px",
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = "#8080c0";
              e.target.style.color = "#b0b0d0";
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = "#4a4a7a";
              e.target.style.color = "#8888aa";
            }}
          >
            {isPaused ? "▶" : "⏸"}
          </button>
        </div>
      )}

      {gameState === "idle" ? (
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: "14px",
              color: "#8888aa",
              marginBottom: "24px",
              maxWidth: "360px",
              lineHeight: "1.7",
            }}
          >
            Name each note. Use keyboard (A–G) or click the buttons.
          </div>
          
          {/* Clef selector */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              justifyContent: "center",
              marginBottom: "24px",
            }}
          >
            <button
              onClick={() => handleClefChange("bass")}
              style={{
                background: selectedClefs.includes("bass") ? "#2a2a4a" : "none",
                border: "1px solid #4a4a7a",
                color: selectedClefs.includes("bass") ? "#e0e0f0" : "#8888aa",
                padding: "12px 20px",
                fontSize: "48px",
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "serif",
                width: "80px",
                height: "80px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "#8080c0";
                if (!selectedClefs.includes("bass")) e.target.style.color = "#b0b0d0";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "#4a4a7a";
                e.target.style.color = selectedClefs.includes("bass") ? "#e0e0f0" : "#8888aa";
              }}
            >
              𝄢
            </button>
            <button
              onClick={() => handleClefChange("treble")}
              style={{
                background: selectedClefs.includes("treble") ? "#2a2a4a" : "none",
                border: "1px solid #4a4a7a",
                color: selectedClefs.includes("treble") ? "#e0e0f0" : "#8888aa",
                padding: "12px 20px",
                fontSize: "58px",
                cursor: "pointer",
                transition: "all 0.2s",
                fontFamily: "serif",
                width: "80px",
                height: "80px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = "#8080c0";
                if (!selectedClefs.includes("treble")) e.target.style.color = "#b0b0d0";
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = "#4a4a7a";
                e.target.style.color = selectedClefs.includes("treble") ? "#e0e0f0" : "#8888aa";
              }}
            >
              𝄞
            </button>
          </div>
          
          <button
            onClick={startGame}
            style={{
              background: "none",
              border: "1px solid #4a4a7a",
              color: "#b0b0d0",
              padding: "14px 48px",
              fontSize: "14px",
              letterSpacing: "3px",
              textTransform: "uppercase",
              cursor: "pointer",
              transition: "all 0.2s",
              fontFamily: "inherit",
            }}
            onMouseEnter={(e) => {
              e.target.style.borderColor = "#8080c0";
              e.target.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.target.style.borderColor = "#4a4a7a";
              e.target.style.color = "#b0b0d0";
            }}
          >
            Start
          </button>
        </div>
      ) : (
        <>
          {/* Mobile clef selector - shows on top for narrow screens */}
          <div
            className="mobile-clef-selector"
            style={{
              display: "none",
              gap: "12px",
              justifyContent: "center",
              marginBottom: "8px",
              marginTop: "60px",
            }}
          >
            {clefButtonsJSX}
          </div>

          {/* Mobile range selector */}
          <div
            className="mobile-clef-selector"
            style={{
              display: "none",
              gap: "8px",
              justifyContent: "center",
              marginBottom: "16px",
            }}
          >
            {rangeButtonsJSX}
          </div>

          <div
            style={{
              width: "100%",
              maxWidth: "600px",
              display: "flex",
              gap: "32px",
              alignItems: "flex-start",
              marginTop: "60px",
            }}
            className="game-container"
          >
            {/* Clef selector sidebar - shows on left for wider screens */}
            <div
              className="desktop-clef-selector"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                paddingTop: "60px",
              }}
            >
              {clefButtonsJSX}
              <div style={{ borderTop: "1px solid #2a2a4a", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                {rangeButtonsJSX}
              </div>
            </div>

            {/* Main game area */}
            <div style={{ flex: 1, minWidth: 0, maxWidth: "100%" }}>
              {/* Elapsed time */}
              <div
                style={{
                  textAlign: "center",
                  fontSize: "22px",
                  color: "#5a5a7a",
                  marginBottom: "20px",
                  fontVariantNumeric: "tabular-nums",
                  letterSpacing: "1px",
                }}
              >
                {(elapsed / 1000).toFixed(1)}s
                {isPaused && (
                  <span
                    style={{
                      marginLeft: "12px",
                      fontSize: "14px",
                      color: "#8888aa",
                      letterSpacing: "2px",
                    }}
                  >
                    PAUSED
                  </span>
                )}
              </div>

              {/* Staff */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginBottom: "28px",
                  width: "100%",
                  overflow: "hidden",
                }}
              >
                <svg width="380" height="180" viewBox="0 0 380 180" style={{ maxWidth: "100%", height: "auto" }}>
                  {/* Staff lines */}
                  {[0, 1, 2, 3, 4].map((i) => (
                    <line
                      key={i}
                      x1={STAFF_LEFT}
                      y1={STAFF_TOP + i * LINE_SPACING}
                      x2={STAFF_LEFT + STAFF_WIDTH}
                      y2={STAFF_TOP + i * LINE_SPACING}
                      stroke="#4a4a6a"
                      strokeWidth="1.5"
                    />
                  ))}

                  {/* Clef symbol */}
                  {currentClef === "bass" ? (
                    <text
                      x={STAFF_LEFT + 12}
                      y={STAFF_TOP + 1.5 * LINE_SPACING}
                      fontSize="72"
                      fill="#7a7aaa"
                      fontFamily="serif"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      𝄢
                    </text>
                  ) : (
                    <text
                      x={STAFF_LEFT + 15}
                      y={STAFF_TOP + 2 * LINE_SPACING + 2}
                      fontSize="88"
                      fill="#7a7aaa"
                      fontFamily="serif"
                      textAnchor="middle"
                      dominantBaseline="central"
                    >
                      𝄞
                    </text>
                  )}

                  {/* Note */}
                  {currentNote && (
                    <>
                      {/* Ledger lines below staff */}
                      {currentNote.pos <= -2 && (
                        <line
                          x1={NOTE_X - 18}
                          y1={getStaffY(-2)}
                          x2={NOTE_X + 18}
                          y2={getStaffY(-2)}
                          stroke="#4a4a6a"
                          strokeWidth="1.5"
                        />
                      )}
                      {currentNote.pos <= -4 && (
                        <line
                          x1={NOTE_X - 18}
                          y1={getStaffY(-4)}
                          x2={NOTE_X + 18}
                          y2={getStaffY(-4)}
                          stroke="#4a4a6a"
                          strokeWidth="1.5"
                        />
                      )}
                      {/* Ledger lines above staff */}
                      {currentNote.pos >= 10 && (
                        <line
                          x1={NOTE_X - 18}
                          y1={getStaffY(10)}
                          x2={NOTE_X + 18}
                          y2={getStaffY(10)}
                          stroke="#4a4a6a"
                          strokeWidth="1.5"
                        />
                      )}
                      {currentNote.pos >= 12 && (
                        <line
                          x1={NOTE_X - 18}
                          y1={getStaffY(12)}
                          x2={NOTE_X + 18}
                          y2={getStaffY(12)}
                          stroke="#4a4a6a"
                          strokeWidth="1.5"
                        />
                      )}

                      {/* Note head */}
                      <ellipse
                        cx={NOTE_X}
                        cy={getStaffY(currentNote.pos)}
                        rx={9}
                        ry={7}
                        fill={
                          isGolden
                            ? "#FFD700"
                            : feedback === null
                            ? "#d0d0f0"
                            : feedback.correct
                            ? "#6abf6a"
                            : "#bf6a6a"
                        }
                        transform={`rotate(-8, ${NOTE_X}, ${getStaffY(
                          currentNote.pos
                        )})`}
                        style={{ transition: "fill 0.15s" }}
                      />

                      {/* Stem */}
                      {currentNote.pos < 5 ? (
                        <line
                          x1={NOTE_X + 8.5}
                          y1={getStaffY(currentNote.pos)}
                          x2={NOTE_X + 8.5}
                          y2={getStaffY(currentNote.pos) - 40}
                          stroke={
                            isGolden
                              ? "#FFD700"
                              : feedback === null
                              ? "#d0d0f0"
                              : feedback.correct
                              ? "#6abf6a"
                              : "#bf6a6a"
                          }
                          strokeWidth="1.5"
                          style={{ transition: "stroke 0.15s" }}
                        />
                      ) : (
                        <line
                          x1={NOTE_X - 8.5}
                          y1={getStaffY(currentNote.pos)}
                          x2={NOTE_X - 8.5}
                          y2={getStaffY(currentNote.pos) + 40}
                          stroke={
                            isGolden
                              ? "#FFD700"
                              : feedback === null
                              ? "#d0d0f0"
                              : feedback.correct
                              ? "#6abf6a"
                              : "#bf6a6a"
                          }
                          strokeWidth="1.5"
                          style={{ transition: "stroke 0.15s" }}
                        />
                      )}
                    </>
                  )}
                </svg>
              </div>

              {/* Feedback text */}
              <div
                style={{
                  height: "30px",
                  textAlign: "center",
                  marginBottom: "16px",
                  fontSize: "13px",
                  letterSpacing: "2px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {feedback &&
                  (feedback.correct ? (
                    <span style={{ color: "#6abf6a" }}>
                      ✓ {(feedback.time / 1000).toFixed(1)}s
                    </span>
                  ) : (
                    <span style={{ color: "#bf6a6a" }}>
                      Nope — {currentNote?.name}
                    </span>
                  ))}
              </div>

              {/* Note buttons */}
              <div
                className="note-buttons"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "8px",
                  marginBottom: "32px",
                  flexWrap: "wrap",
                  maxWidth: "100%",
                }}
              >
                {noteButtons.map((n) => (
                  <button
                    key={n}
                    onClick={() => handleAnswer(n)}
                    disabled={gameState !== "playing" || isPaused}
                    style={{
                      width: "44px",
                      height: "44px",
                      background:
                        gameState !== "playing" || isPaused ? "#1a1a2e" : "#2a2a4a",
                      border: "1px solid #3a3a5a",
                      color:
                        gameState !== "playing" || isPaused ? "#4a4a6a" : "#c0c0e0",
                      fontSize: "16px",
                      cursor:
                        gameState === "playing" && !isPaused ? "pointer" : "default",
                      fontFamily: "inherit",
                      transition: "all 0.1s",
                    }}
                    onMouseEnter={(e) => {
                      if (gameState === "playing" && !isPaused) {
                        e.target.style.borderColor = "#7070a0";
                        e.target.style.color = "#fff";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.borderColor = "#3a3a5a";
                      e.target.style.color =
                        gameState !== "playing" || isPaused ? "#4a4a6a" : "#c0c0e0";
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>

              {/* Stats row */}
              <div
                className="stats-container"
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: "24px",
                  fontSize: "12px",
                  color: "#6a6a8a",
                  letterSpacing: "1px",
                  marginBottom: "20px",
                  flexWrap: "wrap",
                }}
              >
                <div style={{ minWidth: "70px", textAlign: "center" }}>
                  <span style={{ color: "#8888bb" }}>Rounds</span>{" "}
                  <span style={{ color: "#b0b0e0" }}>{totalAnswered}</span>
                </div>
                <div style={{ minWidth: "70px", textAlign: "center" }}>
                  <span style={{ color: "#8888bb" }}>Streak</span>{" "}
                  <span style={{ color: streak > 0 ? "#b0b0e0" : "#6a6a8a" }}>
                    {streak}
                  </span>
                </div>
                <div style={{ minWidth: "60px", textAlign: "center" }}>
                  <span style={{ color: "#8888bb" }}>Best</span>{" "}
                  <span style={{ color: "#b0b0e0" }}>{bestStreak}</span>
                </div>
                <div style={{ minWidth: "60px", textAlign: "center" }}>
                  <span style={{ color: "#8888bb" }}>Acc</span>{" "}
                  <span style={{ color: "#b0b0e0" }}>
                    {totalAnswered > 0
                      ? Math.round((totalCorrect / totalAnswered) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div style={{ minWidth: "80px", textAlign: "center" }}>
                  <span style={{ color: "#8888bb" }}>Avg</span>{" "}
                  <span style={{ color: "#b0b0e0" }}>
                    {recentTimes.length > 0
                      ? (avgTime / 1000).toFixed(1) + "s"
                      : "—"}
                  </span>
                </div>
              </div>

              {/* Restart */}
              <div style={{ textAlign: "center", marginTop: "24px" }}>
                <button
                  onClick={startGame}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#4a4a6a",
                    fontSize: "11px",
                    letterSpacing: "2px",
                    cursor: "pointer",
                    fontFamily: "inherit",
                    textTransform: "uppercase",
                  }}
                  onMouseEnter={(e) => (e.target.style.color = "#8888bb")}
                  onMouseLeave={(e) => (e.target.style.color = "#4a4a6a")}
                >
                  Restart
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <style>{`
        @media (max-width: 640px) {
          .desktop-clef-selector {
            display: none !important;
          }
          .mobile-clef-selector {
            display: flex !important;
          }
          .stats-container {
            max-width: 300px;
            gap: 16px !important;
          }
          .game-container {
            gap: 16px !important;
            padding: 0 8px;
            max-width: 100vw !important;
          }
          .note-buttons {
            max-width: 200px !important;
            margin: 0 auto 32px auto !important;
          }
        }
      `}</style>
    </div>
  );
}
