import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Clock, CheckCircle, XCircle, Trophy, RotateCcw, Play, AlertTriangle } from 'lucide-react';
import gameData from './workflow-game-data.json';

// Directly embed gameData since importing local JSON files can cause resolution issues in some environments.
// This data was originally from workflow-game-data.json



const LendingPuzzleRace = () => {
  // Initialize with a default domain, e.g., the first one from gameData or a specific one.
  // This ensures selectedDomain is not null when initializeGame is first called.
  const [selectedDomain, setSelectedDomain] = useState(gameData.domains[0]?.name || null);
  const [gameState, setGameState] = useState('menu'); // menu, playing, completed
  const [timeLeft, setTimeLeft] = useState(gameData.puzzleTimeSeconds); // Use configurable time
  const [score, setScore] = useState(0);
  const [currentStageIndex, setCurrentStageIndex] = useState(0); // Still used for stage name display and future expansion
  const [totalPuzzlesCompleted, setTotalPuzzlesCompleted] = useState(0); // New state for overall puzzle completion

  const [correctSteps, setCorrectSteps] = useState([]); // Loaded for current puzzle
  const [shuffledSteps, setShuffledSteps] = useState([]);
  const [arrangedSteps, setArrangedSteps] = useState([]);
  const [draggedItem, setDraggedItem] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState('');


  // New state for custom game messages (success/fail/winner)
  const [showGameMessage, setShowGameMessage] = useState(false);
  const [gameMessageTitle, setGameMessageTitle] = useState('');
  const [gameMessageText, setGameMessageText] = useState(''); // Corrected useState declaration
  const [gameMessageIcon, setGameMessageIcon] = useState(null); // Lucide icon component

  // To track completed puzzles in the *current* session for randomization (avoiding repeats)
  const [completedPuzzlesInSession, setCompletedPuzzlesInSession] = useState([]); // Renamed from completedPuzzlesInStage

  // New states for level progression
  const [currentLevel, setCurrentLevel] = useState(1);
  const [completedStagesInCurrentLevel, setCompletedStagesInCurrentLevel] = useState(new Set());

  // Calculate total puzzles in the selected domain for the entire game
  // This is the total number of *actual puzzles* available in the selected domain, across all its stages.
  const totalPuzzlesInSelectedDomain = useMemo(() => {
    const domain = gameData.domains.find(d => d.name === selectedDomain);
    if (!domain) return 0;
    return domain.stages.reduce((acc, stage) => acc + stage.puzzles.length, 0);
  }, [selectedDomain]);

  // Calculate the total number of stages required to win the entire game (across all levels)
  const totalStagesToWinGame = useMemo(() => {
    return Object.values(gameData.levelStageConfig).reduce((acc, stages) => acc + stages, 0);
  }, []);


  // Function to get a random non-repeating puzzle from ANY stage relevant to the current level
  const getRandomPuzzle = useCallback(() => {
    const selectedDomainData = gameData.domains.find(d => d.name === selectedDomain);
    if (!selectedDomainData) return null; // Ensure a domain is selected before proceeding

    // Calculate the start and end indices of stages for the current level
    let startIndex = 0;
    for (let i = 1; i < currentLevel; i++) {
      const prevLevelKey = `Level${i}`;
      startIndex += gameData.levelStageConfig[prevLevelKey];
    }
    const requiredStagesForCurrentLevel = gameData.levelStageConfig[`Level${currentLevel}`];
    const endIndex = startIndex + requiredStagesForCurrentLevel;

    // Get only the stages relevant to the current level
    const currentLevelStages = selectedDomainData.stages.slice(startIndex, endIndex);

    // FlatMap puzzles only from these current level stages
    const allPuzzlesInCurrentLevelStages = currentLevelStages.flatMap(stage => stage.puzzles);

    // Filter out puzzles that have already been completed in this session
    const availablePuzzles = allPuzzlesInCurrentLevelStages.filter(
      (puzzle) => !completedPuzzlesInSession.includes(puzzle.id)
    );

    if (availablePuzzles.length === 0) {
      // No more unique puzzles available in the current level's designated stages.
      // The game logic in checkSolution will handle level advancement or game over.
      return null;
    }

    const randomIndex = Math.floor(Math.random() * availablePuzzles.length);
    return availablePuzzles[randomIndex];
  }, [completedPuzzlesInSession, selectedDomain, currentLevel]); // currentLevel added to dependencies


  // Initialize game or move to the next puzzle
  const initializeGame = useCallback(() => {
    setShowGameMessage(false); // Hide any previous messages

    const puzzleData = getRandomPuzzle();

    if (puzzleData) {
      setCorrectSteps(puzzleData.correctSteps);
      setShuffledSteps(puzzleData.shuffledSteps || []);
      console.log("Setting Question: ", puzzleData.question);
      setCurrentQuestion(puzzleData.question || '');
      setArrangedSteps([]);
      setTimeLeft(gameData.puzzleTimeSeconds); // Reset timer for each new puzzle using configurable time
      setGameState('playing'); // Ensure game state is playing
    } else {
      // This 'else' means getRandomPuzzle returned null, which implies all available puzzles are exhausted for the current level.
      // The game logic in checkSolution will handle level advancement or game over.
      // If we reach here, it means all puzzles in the current level's stages are done,
      // but the level advancement condition in checkSolution might not have been met yet (e.g., not enough unique stages completed).
      // Or it means all levels are completed.
      setGameMessageTitle("No More Puzzles Available in this Level!");
      setGameMessageText("You've exhausted all unique puzzles in the current level's workflows. Keep mastering stages to advance!");
      setGameMessageIcon(<AlertTriangle className="text-yellow-500" />);
      setShowGameMessage(true);
      setTimeout(() => {
        setShowGameMessage(false);
        // If all puzzles in the current level are exhausted, but not enough stages are done to win,
        // we might want to go to a "stuck" state or back to menu. For now, go to menu.
        setGameState('menu');
      }, 3000);
    }
  }, [getRandomPuzzle]);

  // Start game from the beginning (menu button click)
  const startGame = () => {
    // If no domain is explicitly selected by the user, default to the first one available
    if (!selectedDomain && gameData.domains.length > 0) {
      setSelectedDomain(gameData.domains[0].name);
    }
    setCurrentStageIndex(0);
    setCompletedPuzzlesInSession([]);
    setScore(0);
    setTotalPuzzlesCompleted(0);
    setCurrentLevel(1); // Reset current level
    setCompletedStagesInCurrentLevel(new Set()); // Reset completed stages for the new level
    // Use a setTimeout with 0 delay to ensure selectedDomain state updates before initializeGame is called
    // or refactor initializeGame to take selectedDomain as an argument.
    // For simplicity, ensuring selectedDomain is not null initially is better.
    initializeGame();
  };

  // Reset Game function - Resets all game states to their initial values
  const resetGame = useCallback(() => {
    setGameState('menu');
    setSelectedDomain(gameData.domains[0]?.name || null); // Reset to default selected domain
    setScore(0);
    setTotalPuzzlesCompleted(0);
    setCompletedPuzzlesInSession([]);
    setTimeLeft(gameData.puzzleTimeSeconds); // Reset timer using configurable time
    setShuffledSteps([]);
    setArrangedSteps([]);
    setDraggedItem(null); // Clear any dragged item
    setCurrentQuestion('');
    setShowGameMessage(false);
    setGameMessageTitle('');
    setGameMessageText('');
    setGameMessageIcon(null);
    setCurrentLevel(1); // Reset current level
    setCompletedStagesInCurrentLevel(new Set()); // Reset completed stages for the new level
  }, []);


  // Timer effect
  useEffect(() => {
    let interval;
    if (gameState === 'playing' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && gameState === 'playing') {
      // Time's up, game over
      setGameMessageTitle("Time's Up!");
      setGameMessageText("You ran out of time. Game Over!");
      setGameMessageIcon(<XCircle className="text-red-500" />); // Keep red for error
      setShowGameMessage(true);
      setTimeout(() => {
        setShowGameMessage(false);
        setGameState('menu');
      }, 3000);
    }
    return () => clearInterval(interval);
  }, [gameState, timeLeft]);

  // Drag and drop handlers
  const handleDragStart = (e, item, source) => {
    setDraggedItem({ item, source });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e, targetArea) => {
    e.preventDefault();
    if (!draggedItem) return;

    const { item, source } = draggedItem;

    let newShuffledSteps = [...shuffledSteps];
    let newArrangedSteps = [...arrangedSteps];

    if (targetArea === 'arranged' && source === 'shuffled') {
      newShuffledSteps = newShuffledSteps.filter(step => step.id !== item.id);
      newArrangedSteps = [...newArrangedSteps, item];
    } else if (targetArea === 'shuffled' && source === 'arranged') {
      newArrangedSteps = newArrangedSteps.filter(step => step.id !== item.id);
      newShuffledSteps = [...newShuffledSteps, item];
    }

    setShuffledSteps(newShuffledSteps);
    setArrangedSteps(newArrangedSteps);
    setDraggedItem(null);
  };

  const checkSolution = (solution) => {
    // Only check if all steps are arranged
    if (solution.length !== correctSteps.length) {
      return;
    }
    const isCorrect = solution.every((step, index) => step.id === correctSteps[index].id);

    if (isCorrect) {
      const timeBonus = Math.floor(timeLeft / 10);
      setScore(prev => prev + 10);

      // Mark the current puzzle as completed in the session
      const selectedDomainData = gameData.domains.find(d => d.name === selectedDomain);
      let currentPuzzle = null;
      let currentStageId = null;

      if (selectedDomainData) {
        // Find the puzzle and its stage
        for (const stage of selectedDomainData.stages) {
          const foundPuzzle = stage.puzzles.find(p => p.correctSteps[0].id === correctSteps[0].id);
          if (foundPuzzle) {
            currentPuzzle = foundPuzzle;
            currentStageId = stage.id;
            break;
          }
        }
      }

      if (currentPuzzle) {
        setCompletedPuzzlesInSession(prev => [...prev, currentPuzzle.id]);
      }

      // Update total puzzles completed
      const newTotalPuzzlesCompleted = totalPuzzlesCompleted + 1;
      setTotalPuzzlesCompleted(newTotalPuzzlesCompleted);

      // Level progression logic
      const currentLevelKey = `Level${currentLevel}`;
      const requiredStagesForCurrentLevel = gameData.levelStageConfig[currentLevelKey];

      // Add the completed stage to the set for the current level
      if (currentStageId) {
        setCompletedStagesInCurrentLevel(prev => new Set(prev).add(currentStageId));
      }

      // Check if the required number of unique stages for the current level have been completed
      const hasCompletedRequiredStages = completedStagesInCurrentLevel.size + 1 >= requiredStagesForCurrentLevel; // +1 because state updates are async


      if (currentLevel < gameData.levelsToWin && hasCompletedRequiredStages) {
        // Advance to the next level
        setGameMessageTitle("Level Complete!");
        setGameMessageText(`You've completed Level ${currentLevel}! Advancing to Level ${currentLevel + 1}.`);
        setGameMessageIcon(<Trophy className="text-blue-500" />);
        setShowGameMessage(true);

        setTimeout(() => {
          setShowGameMessage(false);
          setCurrentLevel(prev => prev + 1);
          setCompletedStagesInCurrentLevel(new Set()); // Reset stages for the new level
          initializeGame(); // Load next puzzle for the new level
        }, 2500);

      } else if (currentLevel === gameData.levelsToWin && hasCompletedRequiredStages) {
        // Game Win condition
        setGameMessageTitle("Congratulations, Winner!");
        setGameMessageText(`You've mastered all levels in ${selectedDomain} with a final score of ${score}!`);
        setGameMessageIcon(<Trophy className="text-yellow-500" />);
        setShowGameMessage(true);
        setTimeout(() => {
          setShowGameMessage(false);
          setGameState('completed');
        }, 3000);
      } else {
        // Show success message and proceed to next puzzle within the same level
        setGameMessageTitle("Correct Order!");
        setGameMessageText("Excellent! Proceeding to the next challenge.");
        setGameMessageIcon(<CheckCircle className="text-green-600" />);
        setShowGameMessage(true);

        setTimeout(() => {
          setShowGameMessage(false);
          initializeGame(); // Load next puzzle
        }, 2000);
      }

    } else {
      // Handle incorrect solution - Game Over
      setScore(prev => Math.max(0, prev - 50));
      setGameMessageTitle("Incorrect Order!");
      setGameMessageText("Oops! The workflow is incorrect. Game Over.");
      setGameMessageIcon(<XCircle className="text-red-600" />);
      setShowGameMessage(true);

      setTimeout(() => {
        setShowGameMessage(false);
        setGameState('menu');
      }, 3000);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getPhaseColorClass = (phase) => {
    switch (phase) {
      case 'initiation': return 'phase-corporate-blue';
      case 'execution': return 'phase-corporate-green';
      case 'settlement': return 'phase-corporate-orange';
      default: return 'phase-corporate-default';
    }
  };

  return (
    <div className="lc-puzzle-container">
      <style>
        {`
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 0;
            overflow-x: hidden;
        }

        .lc-puzzle-container {
            min-height: 100vh;
            background-color: #F8F9FA; /* Light gray/off-white background */
            padding: 20px;
            box-sizing: border-box;
            color: #333333; /* Dark gray for general text */
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            /* Increased max-width for the overall container */
            max-width: 1400px; /* Adjust as needed for desired page width */
            margin: 0 auto; /* Center the container */
        }

        /* Menu State */
        .menu-container {
            min-height: 100vh;
            width: 100%;
            background-color: #F8F9FA; /* Consistent with main background */
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        }

        .menu-card {
            background: #FFFFFF; /* Solid white background */
            border-radius: 8px; /* Slightly less rounded */
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1); /* Softer shadow */
            padding: 2rem;
            max-width: 48rem; /* Increased max-width for menu card */
            width: 100%;
            text-align: center;
            border: 2px solid #DDDDDD; /* More prominent border */
        }

        .menu-icon {
            margin: 0 auto 1rem;
            height: 4rem;
            width: 4rem;
            color: #004481; /* Corporate blue icon color */
        }

        .menu-title {
            font-size: 2.2rem; /* Larger title */
            font-weight: 700;
            color: #333333;
            margin-bottom: 0.75rem;
        }

        .menu-subtitle {
            color: #666666; /* Medium gray for subtitle */
            margin-bottom: 2rem; /* Increased margin */
            font-size: 1.1rem; /* Slightly larger subtitle */
        }

        .how-to-play-box {
            background-color: #F0F4F8; /* Lighter background for the box */
            border-radius: 6px; /* Slightly less rounded */
            padding: 1.5rem; /* Increased padding */
            margin-bottom: 2rem; /* Increased margin */
            text-align: left;
            color: #333333;
            border: 1px solid #CCCCCC; /* More visible border */
        }

        .how-to-play-title {
            font-weight: 600;
            color: #333333;
            margin-bottom: 0.75rem; /* Adjusted margin */
            font-size: 1.1rem; /* Slightly larger title */
        }

        .how-to-play-list li {
            margin-bottom: 0.6rem; /* Adjusted margin */
            line-height: 1.6; /* Slightly more line height */
            color: #666666;
            font-size: 0.95rem;
        }

        .domain-selection-container {
            margin-bottom: 2rem; /* Increased margin */
            text-align: center;
            border: 1px solid #CCCCCC; /* Border for the domain section */
            padding: 1.5rem;
            border-radius: 6px;
            background-color: #FDFDFD;
        }

        .domain-selection-container label {
            display: block;
            margin-bottom: 1rem; /* Increased margin */
            color: #333333;
            font-weight: 600;
            font-size: 1.1rem;
        }

        .domain-buttons-wrapper {
            display: flex;
            gap: 0.75rem; /* Increased gap */
            flex-wrap: wrap;
            justify-content: center; /* Center items in case of odd number */
        }

        .domain-button {
            padding: 10px 20px; /* Increased padding */
            border: 1px solid #004481; /* Blue border */
            background: #FFFFFF;
            color: #004481;
            border-radius: 6px; /* More rounded */
            cursor: pointer;
            transition: all 0.2s ease; /* Faster transition */
            font-weight: 600;
            flex: 1 1 calc(50% - 0.75rem); /* Two buttons per row with a gap */
            max-width: calc(50% - 0.75rem); /* Ensures it doesn't grow beyond 50% */
            min-width: 150px; /* Minimum width to prevent shrinking too much on small screens */
            font-size: 1rem; /* Slightly larger font */
            box-shadow: 0 2px 5px rgba(0, 68, 129, 0.1); /* Subtle shadow */
        }

        @media (max-width: 600px) {
            .domain-button {
                flex: 1 1 100%; /* Full width on very small screens */
                max-width: 100%;
            }
        }

        .domain-button.selected, .domain-button:hover {
            background: #004481; /* Solid blue background */
            color: #FFFFFF;
            transform: translateY(-3px); /* More pronounced lift */
            box-shadow: 0 5px 12px rgba(0, 68, 129, 0.4); /* More prominent blue shadow */
        }

        .start-game-button, .play-again-button {
            background: #004481; /* Solid corporate blue */
            color: #FFFFFF;
            border: none;
            padding: 15px 35px; /* Adjusted padding */
            border-radius: 8px;
            font-size: 1.2rem;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 5px 15px rgba(0, 68, 129, 0.3);
            font-weight: 600;
            letter-spacing: 0.5px;
            width: 100%;
            margin-top: 20px; /* Space between domain selection and button */
        }

        .start-game-button:hover, .play-again-button:hover {
            background: #0056A0; /* Slightly darker blue on hover */
            transform: translateY(-2px);
            box-shadow: 0 7px 20px rgba(0, 68, 129, 0.4);
        }

        /* Game Play State */
        .game-header {
            width: 100%;
            display: flex;
            flex-direction: column; /* Stack items vertically */
            align-items: center;
            margin-bottom: 25px;
            padding: 15px 30px;
            background-color: #FFFFFF;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
            max-width: 1200px;
            box-sizing: border-box;
        }

        .header-row {
            display: flex;
            justify-content: space-between;
            width: 100%;
            margin-bottom: 10px; /* Space between rows */
            flex-wrap: wrap; /* Allow items within a row to wrap */
        }

        .header-row:last-child {
            margin-bottom: 0;
        }

        .header-section {
            display: flex;
            align-items: center;
            font-size: 1.1rem;
            color: #555555;
            font-weight: 500;
            margin-right: 20px; /* Space between sections in a row */
        }

        .header-section:last-child {
            margin-right: 0;
        }

        @media (max-width: 767px) {
            .header-section {
                margin-bottom: 10px; /* Add margin for wrapping on small screens */
            }
            .header-row {
                justify-content: center; /* Center items when wrapped */
            }
        }

        .header-section svg {
            margin-right: 8px;
            color: #004481;
        }

        .score-display span, .timer-display span, .level-display span, .total-puzzles-display span, .stages-completed-display span {
            font-weight: 700;
            color: #004481;
            margin-left: 5px;
        }

        .header-domain-name {
            font-size: 1.3rem;
            font-weight: 700;
            color: #004481;
            text-align: center;
            flex-grow: 1; /* Allows it to take available space */
            margin: 0 20px; /* Horizontal margin */
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .reset-game-button {
            background-color: #dc3545;
            color: white;
            border: none;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 5px;
            font-size: 0.95rem;
            font-weight: 600;
            transition: background-color 0.2s ease, transform 0.2s ease;
        }

        .reset-game-button:hover {
            background-color: #c82333;
            transform: translateY(-1px);
        }

        .puzzle-section-wrapper {
          display: flex;
          flex-direction: row; /* Default to row for wider screens */
          gap: 25px;
          width: 100%;
          max-width: 1200px;
          align-items: flex-start; /* Align items to the top */
        }

        @media (max-width: 1024px) { /* Adjust breakpoint as needed */
          .puzzle-section-wrapper {
            flex-direction: column; /* Stack vertically on smaller screens */
          }
        }

        .puzzle-section {
            display: flex;
            flex-direction: column;
            flex: 2; /* Takes more space than the progress list */
            background-color: #FFFFFF; /* White background */
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            padding: 30px; /* Increased padding */
            box-sizing: border-box;
            margin-bottom: 25px;
            width: 100%; /* Ensure it takes full width when stacked */
        }

        .question-box {
            background-color: #E6EEF5; /* Light blue for question */
            border-left: 5px solid #004481; /* Corporate blue border */
            padding: 18px 25px; /* Increased padding */
            margin-bottom: 30px; /* More space */
            border-radius: 5px;
            font-size: 1.25rem; /* Larger font for question */
            font-weight: 600;
            color: #004481; /* Corporate blue text */
        }

        .drag-drop-areas {
            display: flex;
            flex-direction: row; /* Ensures side-by-side layout */
            justify-content: space-between;
            gap: 25px; /* Increased gap */
            width: 100%;
            flex-wrap: wrap; /* Allow wrapping on smaller screens */
            align-items: flex-start; /* Align items to the top */
        }

        .shuffled-steps-area, .arranged-steps-area {
            background-color: #F8F8F8; /* Light grey for areas */
            border: 2px dashed #CCCCCC; /* Clearer dashed border */
            border-radius: 8px;
            padding: 20px;
            flex: 1; /* Allows them to grow and shrink */
            min-height: 250px; /* Increased min-height */
            display: flex;
            flex-direction: column;
            gap: 12px; /* Gap between puzzle items */
            transition: all 0.2s ease;
            box-shadow: inset 0 1px 5px rgba(0, 0, 0, 0.05); /* Inner shadow */
            min-width: 500px; /* Ensure a minimum width before wrapping */
            min-height: 650px;
        }

        @media (max-width: 900px) {
            .drag-drop-areas {
                flex-direction: column;
                gap: 20px;
            }
            .shuffled-steps-area, .arranged-steps-area {
                min-width: unset; /* Remove min-width when stacking */
                width: 100%; /* Take full width when stacked */
                max-width: 100%; /* Ensure it doesn't exceed 100% */
            }
        }

        .drag-drop-area.highlight {
            border-color: #004481; /* Highlight with corporate blue */
            background-color: #EBF2F8; /* Lighter blue background */
        }

        .area-title {
            font-weight: 700;
            color: #004481;
            margin-bottom: 15px; /* Space below title */
            text-align: center;
            font-size: 1.1rem;
        }

        .puzzle-item {
            background-color: #FFFFFF;
            border: 1px solid #DDDDDD; /* Lighter border */
            border-radius: 6px;
            padding: 12px 18px; /* Adjusted padding */
            cursor: grab;
            font-size: 0.95rem; /* Slightly smaller text for items */
            font-weight: 500;
            color: #444444;
            box-shadow: 0 2px 6px rgba(0, 0, 0, 0.07); /* Subtle shadow */
            transition: transform 0.1s ease-in-out;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
        }

        .puzzle-item:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
        }

        .puzzle-item.dragging {
            opacity: 0.5;
            border: 2px dashed #004481;
        }

        .puzzle-item-title {
            font-weight: 600;
            margin-bottom: 5px;
            color: #333333;
        }

        .puzzle-item-description {
            font-size: 0.85rem;
            color: #777777;
        }

        .phase-tag {
            font-size: 0.75rem;
            font-weight: 700;
            padding: 4px 8px;
            border-radius: 4px;
            margin-top: 8px;
            align-self: flex-end; /* Aligns to bottom-right of the item */
            text-transform: uppercase;
        }

        .phase-corporate-blue {
            background-color: #E6EEF5; /* Light blue */
            color: #004481; /* Corporate blue */
        }
        .phase-corporate-green {
            background-color: #E0F2E6; /* Light green */
            color: #28A745; /* Corporate green */
        }
        .phase-corporate-orange {
            background-color: #FFF3E0; /* Light orange */
            color: #FD7E14; /* Corporate orange */
        }
        .phase-corporate-default {
            background-color: #F0F0F0;
            color: #555555;
        }


        .submit-button-container {
            width: 100%;
            max-width: 1200px;
            display: flex;
            justify-content: center;
            margin-top: 25px; /* Space between areas and button */
            gap: 20px; /* Gap between buttons */
            flex-wrap: wrap; /* Allow buttons to wrap */
        }

        .submit-button, .reset-game-button-bottom {
            background: #28A745; /* Green for submit */
            color: #FFFFFF;
            border: none;
            padding: 15px 40px;
            border-radius: 8px;
            font-size: 1.2rem;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 5px 15px rgba(40, 167, 69, 0.3);
            font-weight: 600;
            letter-spacing: 0.5px;
        }

        .submit-button:hover {
            background: #218838; /* Darker green on hover */
            transform: translateY(-2px);
            box-shadow: 0 7px 20px rgba(40, 167, 69, 0.4);
        }

        .reset-game-button-bottom {
            background-color: #dc3545; /* Red for reset */
            box-shadow: 0 5px 15px rgba(220, 53, 69, 0.3);
        }

        .reset-game-button-bottom:hover {
            background-color: #c82333; /* Darker red on hover */
            transform: translateY(-2px);
            box-shadow: 0 7px 20px rgba(220, 53, 69, 0.4);
        }

        /* Game Message Overlay */
        .game-message-overlay {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0, 0, 0, 0.6); /* Darker overlay */
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1000;
            backdrop-filter: blur(5px); /* Frosted glass effect */
        }

        .game-message-card {
            background: #FFFFFF;
            border-radius: 12px; /* More rounded */
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2); /* More pronounced shadow */
            padding: 2.5rem; /* More padding */
            max-width: 500px;
            width: 90%;
            text-align: center;
            transform: translateY(0); /* Ensure no initial transform */
            opacity: 1;
            animation: fadeInScale 0.3s ease-out; /* Add animation */
            border: 2px solid #DDDDDD; /* Light border */
        }

        @keyframes fadeInScale {
            from {
                opacity: 0;
                transform: scale(0.9);
            }
            to {
                opacity: 1;
                transform: scale(1);
            }
        }

        .game-message-icon {
            margin: 0 auto 1.5rem; /* Adjusted margin */
            height: 5rem; /* Larger icon */
            width: 5rem;
        }

        .game-message-title {
            font-size: 2rem; /* Larger title */
            font-weight: 700;
            color: #333333;
            margin-bottom: 1rem;
        }

        .game-message-text {
            color: #666666;
            font-size: 1.1rem;
            margin-bottom: 2rem;
            line-height: 1.5;
        }

        /* Completed State */
        .completed-container {
            min-height: 100vh;
            width: 100%;
            background-color: #F8F9FA;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            box-sizing: border-box;
        }

        .completed-card {
            background: #FFFFFF;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
            padding: 2rem;
            max-width: 50rem; /* Increased max width */
            width: 100%;
            text-align: center;
            border: 2px solid #DDDDDD;
        }

        .completed-icon {
            margin: 0 auto 1rem;
            height: 4rem;
            width: 4rem;
            color: #FFD700; /* Gold trophy color */
        }

        .completed-title {
            font-size: 2.2rem;
            font-weight: 700;
            color: #333333;
            margin-bottom: 0.75rem;
        }

        .completed-score {
            color: #666666;
            margin-bottom: 1rem;
            font-size: 1.1rem;
            font-weight: 500;
        }

        .workflow-mastered-box {
          background-color: #F0F4F8;
          border-radius: 6px;
          padding: 1.5rem;
          margin-top: 1.5rem;
          margin-bottom: 2rem;
          text-align: left;
          color: #333333;
          border: 1px solid #CCCCCC;
        }

        .workflow-mastered-box h3 {
          font-weight: 600;
          color: #004481;
          margin-bottom: 1rem;
          font-size: 1.15rem;
          text-align: center;
        }

        .workflow-mastered-box ul {
          list-style: none; /* Remove default bullet points */
          padding-left: 0;
        }

        .workflow-mastered-box ul li {
          margin-bottom: 0.8rem;
          color: #555555;
          font-size: 1rem;
          line-height: 1.4;
          position: relative;
          padding-left: 1.5rem; /* Space for custom bullet */
        }

        .workflow-mastered-box ul li::before {
          content: '✔'; /* Checkmark for mastered workflows */
          color: #28A745; /* Green checkmark */
          position: absolute;
          left: 0;
          font-weight: bold;
        }

        .workflow-mastered-box ul ul {
          margin-top: 0.4rem;
          border-left: 3px solid #E6EEF5; /* Light blue line */
          padding-left: 1rem;
          list-style: none;
        }

        .workflow-mastered-box ul ul li {
          font-size: 0.9rem;
          color: #777777;
          margin-bottom: 0.3rem;
          padding-left: 1rem;
          position: relative;
        }

        .workflow-mastered-box ul ul li::before {
          content: '•'; /* Small dot for puzzle questions */
          color: #004481; /* Corporate blue dot */
          position: absolute;
          left: 0;
          font-weight: bold;
          font-size: 1.2rem;
          line-height: 1;
        }

        /* Removed progress-list-card styles as it's no longer displayed */
        `}
      </style>

      {/* Game Menu */}
      {gameState === 'menu' && (
        <div className="menu-container">
          <div className="menu-card">
            <Play className="menu-icon" />
            <h1 className="menu-title">Lending Puzzle Race</h1>
            <p className="menu-subtitle">Arrange the workflow steps in the correct order!</p>

            <div className="how-to-play-box">
              <h3 className="how-to-play-title">How to Play:</h3>
              <ul className="how-to-play-list">
                <li>Select a **domain** to start the challenge.</li>
                <li>You'll be presented with **shuffled steps** of a workflow.</li>
                <li>Drag and drop the steps into the **arranged area** in the correct sequence.</li>
                <li>Once all steps are arranged, click **'Check Solution'** to verify.</li>
                <li>Complete the required number of stages to **level up** and eventually win the game!</li>
                <li>Each correct puzzle earns you points and a time bonus.</li>
                <li>An incorrect order or running out of time results in **Game Over**.</li>
              </ul>
            </div>

            <div className="domain-selection-container">
              <label htmlFor="domain-select">Choose your domain:</label>
              <div className="domain-buttons-wrapper">
                {gameData.domains.map(domain => (
                  <button
                    key={domain.name}
                    className={`domain-button ${selectedDomain === domain.name ? 'selected' : ''}`}
                    onClick={() => setSelectedDomain(domain.name)}
                  >
                    {domain.name}
                  </button>
                ))}
              </div>
            </div>

            {selectedDomain && (
              <div className="how-to-play-box" style={{ marginTop: '20px' }}>
                <h3 className="how-to-play-title">Domain Details for {selectedDomain}:</h3>
                <p>Total Puzzles: <strong>{totalPuzzlesInSelectedDomain}</strong></p>
                <p>Levels to Win: <strong>{gameData.levelsToWin}</strong></p>
                <ul>
                  {Object.entries(gameData.levelStageConfig).map(([level, stagesRequired]) => (
                    <li key={level}>
                      <strong>{level}:</strong> Complete {stagesRequired} stages
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button onClick={startGame} className="start-game-button">
              Start Game
            </button>
          </div>
        </div>
      )}

      {/* Game Playing State */}
      {gameState === 'playing' && (
        <>
          <div className="game-header">
            <div className="header-row">
                <div className="header-section score-display">
                  Score: <span>{score}</span>
                </div>
                <div className="header-domain-name">
                 <span>{selectedDomain}</span> Domain Workflow
                </div>
                {/* Updated Total Puzzles Mastered display */}
                <div className="header-section total-puzzles-display">
                  Total Puzzles Mastered: <span>{totalPuzzlesCompleted} / {totalStagesToWinGame}</span>
                </div>
            </div>
            <div className="header-row">
                <div className="header-section level-display">
                  Level: <span>{currentLevel} / {gameData.levelsToWin}</span>
                </div>
                {/* Updated Stages Completed display */}
                <div className="header-section stages-completed-display">
                  Stages Completed: <span>{completedStagesInCurrentLevel.size} / {gameData.levelStageConfig[`Level${currentLevel}`]}</span>
                </div>
                {/* Moved Timer to this position */}
                <div className="header-section timer-display">
                  <Clock /> {formatTime(timeLeft)}
                  <div className="timer-progress-bar">
                    <div
                      className="timer-progress-fill"
                      style={{ transform: `scaleX(${timeLeft / gameData.puzzleTimeSeconds})` }}
                    ></div>
                  </div>
                </div>
            </div>
          </div>

          <div className="puzzle-section-wrapper">
            <div className="puzzle-section">
              <div className="question-box">
                {currentQuestion}
              </div>
              <div className="drag-drop-areas">
                {/* Shuffled Steps Area (Left) */}
                <div
                  className="shuffled-steps-area"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'shuffled')}
                >
                  <div className="area-title">Unordered Workflow</div>
                  {shuffledSteps.map(step => (
                    <div
                      key={step.id}
                      className="puzzle-item"
                      draggable
                      onDragStart={(e) => handleDragStart(e, step, 'shuffled')}
                    >
                      <div className="puzzle-item-title">{step.title}</div>
                      <div className="puzzle-item-description">{step.description}</div>
                      <span className={`phase-tag ${getPhaseColorClass(step.phase)}`}>{step.phase}</span>
                    </div>
                  ))}
                </div>

                {/* Arranged Steps Area (Right) */}
                <div
                  className="arranged-steps-area"
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, 'arranged')}
                >
                  <div className="area-title">Ordered Workflow</div>
                  {arrangedSteps.map(step => (
                    <div
                      key={step.id}
                      className="puzzle-item"
                      draggable
                      onDragStart={(e) => handleDragStart(e, step, 'arranged')}
                    >
                      <div className="puzzle-item-title">{step.title}</div>
                      <div className="puzzle-item-description">{step.description}</div>
                      <span className={`phase-tag ${getPhaseColorClass(step.phase)}`}>{step.phase}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* The progress-list-card section is removed as requested */}
          </div>

          <div className="submit-button-container">
            <button
              onClick={() => checkSolution(arrangedSteps)}
              className="submit-button"
              disabled={arrangedSteps.length !== correctSteps.length}
            >
              Check Solution
            </button>
            {/* Reset Game Button moved to the bottom */}
            <button onClick={resetGame} className="reset-game-button-bottom">
              <RotateCcw size={16} /> Reset Game
            </button>
          </div>

          {showGameMessage && (
            <div className="game-message-overlay">
              <div className="game-message-card">
                {gameMessageIcon}
                <h2 className="game-message-title">{gameMessageTitle}</h2>
                <p className="game-message-text">{gameMessageText}</p>
              </div>
            </div>
          )}
        </>
      )}

      {/* Game Completed State */}
      {gameState === 'completed' && (
        <div className="completed-container">
          <div className="completed-card">
            <Trophy className="completed-icon" />
            <h1 className="completed-title">Game Over!</h1>
            <p className="completed-score">Final Score: {score}</p>
            <p className="completed-score">Total Puzzles Mastered: {totalPuzzlesCompleted}</p>

            <div className="workflow-mastered-box">
              <h3>Workflows you mastered:</h3>
              <ul>
                {gameData.domains.map(domain => {
                  const domainPuzzles = domain.stages.flatMap(stage => stage.puzzles);
                  const completedPuzzles = domainPuzzles.filter(p =>
                    completedPuzzlesInSession.includes(p.id)
                  );
                  if (completedPuzzles.length === 0) return null;

                  return (
                    <li key={domain.name}>
                      <strong>{domain.name}</strong>
                      <ul>
                        {completedPuzzles.map(p => (
                          <li key={p.id}>{p.question}</li>
                        ))}
                      </ul>
                    </li>
                  );
                })}
              </ul>
            </div>


            <button onClick={() => setGameState('menu')} className="play-again-button">
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LendingPuzzleRace;
