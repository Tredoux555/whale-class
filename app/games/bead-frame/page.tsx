

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/games" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <span className="text-xl">←</span>
            <span className="font-medium">Games</span>
          </Link>
          <h1 className="text-xl font-bold text-amber-600">🧮 Bead Frame</h1>
          {gameState.phase !== 'menu' && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-600">⭐ {gameState.xp} XP</span>
              <span className="text-sm font-medium text-orange-500">🔥 {gameState.streak}</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <AnimatePresence mode="wait">
          {/* ============================================ */}
          {/* MENU SCREEN */}
          {/* ============================================ */}
          {gameState.phase === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Small Bead Frame</h2>
                <p className="text-gray-600">Learn place value with the abacus!</p>
              </div>

              {/* Bead Frame Preview */}
              <div className="bg-amber-100/50 rounded-2xl p-4 mb-6">
                <div className="flex items-center justify-center gap-1">
                  {PLACE_VALUES.map((pv, i) => (
                    <div key={pv.id} className="flex flex-col items-center">
                      <span className={`text-xs font-bold px-2 py-1 rounded bg-gradient-to-r ${pv.color} text-white`}>
                        {pv.shortName}
                      </span>
                      <div className="flex gap-0.5 mt-1">
                        {[...Array(3)].map((_, j) => (
                          <div key={j} className={`w-3 h-3 rounded-full ${pv.beadColor} opacity-70`} />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-4">
                {(Object.entries(GAME_MODES) as [GameMode, typeof GAME_MODES[GameMode]][]).map(([key, mode]) => (
                  <motion.button
                    key={key}
                    onClick={() => startGame(key)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={`p-6 rounded-2xl bg-gradient-to-r ${mode.color} text-white shadow-lg
                      flex items-center gap-4 text-left`}
                  >
                    <span className="text-4xl">{mode.icon}</span>
                    <div>
                      <h3 className="text-xl font-bold">{mode.name}</h3>
                      <p className="text-white/80 text-sm">{mode.description}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
                          Level {mode.montessoriLevel}
                        </span>
                        <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
                          {mode.rounds} rounds
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================================ */}
          {/* PLAYING SCREEN */}
          {/* ============================================ */}
          {gameState.phase === 'playing' && gameState.problem && (
            <motion.div
              key="playing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Progress Bar */}
              <div className="bg-white rounded-full h-3 overflow-hidden shadow-inner">
                <motion.div
                  className={`h-full bg-gradient-to-r ${GAME_MODES[gameState.mode].color}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>

              {/* Problem Display */}
              <div className="text-center bg-white rounded-2xl p-6 shadow-lg">
                {gameState.mode === 'build' && (
                  <>
                    <p className="text-gray-500 mb-2">Show this number on the bead frame:</p>
                    <p className="text-5xl font-bold text-gray-800">{gameState.problem.target}</p>
                  </>
                )}
                {gameState.mode === 'addition' && (
                  <>
                    <p className="text-gray-500 mb-2">Add these numbers:</p>
                    <p className="text-4xl font-bold text-gray-800">
                      {gameState.problem.num1} <span className="text-green-500">+</span> {gameState.problem.num2}
                    </p>
                  </>
                )}
                {gameState.mode === 'subtraction' && (
                  <>
                    <p className="text-gray-500 mb-2">Subtract (take away beads):</p>
                    <p className="text-4xl font-bold text-gray-800">
                      {gameState.problem.num1} <span className="text-red-500">−</span> {gameState.problem.num2}
                    </p>
                  </>
                )}
                <p className="text-sm text-gray-400 mt-2">Round {gameState.round + 1} of {gameState.totalRounds}</p>
              </div>

              {/* Bead Frame */}
              <div className="bg-gradient-to-b from-amber-700 to-amber-800 rounded-2xl p-6 shadow-xl">
                {/* Frame top */}
                <div className="bg-amber-900 h-3 rounded-t-lg mb-2" />
                
                {/* Wires */}
                <div className="space-y-4">
                  {gameState.wires.map((wire, wireIndex) => (
                    <div key={wire.id} className="flex items-center gap-3">
                      {/* Label */}
                      <div className={`w-12 text-center py-1 rounded bg-gradient-to-r ${wire.color} text-white text-sm font-bold`}>
                        {wire.shortName}
                      </div>
                      
                      {/* Wire with beads */}
                      <div className="flex-1 relative">
                        {/* Wire line */}
                        <div className="absolute top-1/2 left-0 right-0 h-1 bg-gray-400 rounded -translate-y-1/2" />
                        
                        {/* Beads container */}
                        <div className="relative flex items-center justify-between h-10">
                          {/* Active beads (left side) */}
                          <div className="flex gap-1">
                            {[...Array(wire.activeBeads)].map((_, i) => (
                              <motion.button
                                key={`active-${i}`}
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                onClick={() => moveBead(wireIndex, 'remove')}
                                className={`w-8 h-8 rounded-full ${wire.beadColor} shadow-lg 
                                  hover:scale-110 active:scale-95 transition-transform cursor-pointer
                                  border-2 border-white/30`}
                              />
                            ))}
                          </div>
                          
                          {/* Center divider */}
                          <div className="w-1 h-8 bg-amber-900 rounded" />
                          
                          {/* Inactive beads (right side) */}
                          <div className="flex gap-1 flex-row-reverse">
                            {[...Array(10 - wire.activeBeads)].map((_, i) => (
                              <motion.button
                                key={`inactive-${i}`}
                                onClick={() => moveBead(wireIndex, 'add')}
                                className={`w-8 h-8 rounded-full ${wire.beadColor} opacity-40 shadow
                                  hover:opacity-70 hover:scale-110 active:scale-95 transition-all cursor-pointer
                                  border-2 border-white/20`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      {/* Count */}
                      <div className="w-8 text-center text-white font-bold text-lg">
                        {wire.activeBeads}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Frame bottom */}
                <div className="bg-amber-900 h-3 rounded-b-lg mt-2" />
              </div>

              {/* Current Value Display */}
              <div className="bg-white rounded-2xl p-4 shadow-lg text-center">
                <p className="text-sm text-gray-500">Your number:</p>
                <p className="text-4xl font-bold text-amber-600">{currentValue}</p>
                {gameState.showHint && gameState.problem && (
                  <p className="text-sm text-blue-500 mt-2">
                    Target: {gameState.problem.answer} 
                    {currentValue < gameState.problem.answer && ' (add more beads)'}
                    {currentValue > gameState.problem.answer && ' (remove some beads)'}
                  </p>
                )}
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-4">
                <motion.button
                  onClick={toggleHint}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-gray-200 text-gray-700 rounded-xl font-medium"
                >
                  💡 Hint
                </motion.button>
                <motion.button
                  onClick={checkAnswer}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className={`px-8 py-4 bg-gradient-to-r ${GAME_MODES[gameState.mode].color} 
                    text-white rounded-2xl font-bold text-lg shadow-lg`}
                >
                  Check ✓
                </motion.button>
              </div>
            </motion.div>
          )}

          {/* ============================================ */}
          {/* FEEDBACK OVERLAY */}
          {/* ============================================ */}
          {gameState.phase === 'feedback' && (
            <motion.div
              key="feedback"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 flex items-center justify-center z-50 bg-black/20"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`p-8 rounded-3xl shadow-2xl text-center
                  ${feedback === 'perfect' ? 'bg-gradient-to-br from-yellow-400 to-orange-500' :
                    feedback === 'correct' ? 'bg-gradient-to-br from-green-400 to-green-500' :
                    'bg-gradient-to-br from-red-400 to-red-500'}`}
              >
                <span className="text-6xl">
                  {feedback === 'perfect' ? '🌟' : feedback === 'correct' ? '✓' : '✗'}
                </span>
                <p className="text-white text-2xl font-bold mt-2">
                  {feedback === 'perfect' ? 'Perfect!' : feedback === 'correct' ? 'Correct!' : 'Not quite!'}
                </p>
                {feedback === 'incorrect' && gameState.problem && (
                  <p className="text-white/80 mt-1">The answer was {gameState.problem.answer}</p>
                )}
              </motion.div>
            </motion.div>
          )}

          {/* ============================================ */}
          {/* COMPLETE SCREEN */}
          {/* ============================================ */}
          {gameState.phase === 'complete' && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center space-y-8"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', bounce: 0.5 }}
                className="text-8xl"
              >
                🏆
              </motion.div>

              <h2 className="text-4xl font-bold text-gray-800">Excellent Work!</h2>

              <div className="bg-white rounded-2xl p-8 shadow-lg space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-amber-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-amber-600">{gameState.score}</p>
                    <p className="text-sm text-gray-500">Score</p>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-yellow-600">+{gameState.xp}</p>
                    <p className="text-sm text-gray-500">XP Earned</p>
                  </div>
                  <div className="bg-orange-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-orange-600">{gameState.bestStreak}</p>
                    <p className="text-sm text-gray-500">Best Streak</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-center gap-4">
                <motion.button
                  onClick={() => startGame(gameState.mode)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-2xl
                    font-bold text-lg shadow-lg"
                >
                  Play Again 🔄
                </motion.button>
                <motion.button
                  onClick={() => setGameState(getInitialState())}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-white text-gray-700 rounded-2xl
                    font-bold text-lg shadow-lg border-2 border-gray-200"
                >
                  Choose Mode
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
