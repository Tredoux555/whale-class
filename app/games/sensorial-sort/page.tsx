

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-pink-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/games" className="flex items-center gap-2 text-gray-600 hover:text-gray-900">
            <span className="text-xl">←</span>
            <span className="font-medium">Games</span>
          </Link>
          <h1 className="text-xl font-bold text-rose-600">👁️ Sensorial Sort</h1>
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
                <h2 className="text-3xl font-bold text-gray-800 mb-2">Sensorial Training</h2>
                <p className="text-gray-600">Train your eyes to see colors and sizes!</p>
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
                          {mode.material}
                        </span>
                        <span className="px-2 py-0.5 bg-white/20 rounded text-xs">
                          Level {mode.montessoriLevel}
                        </span>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ============================================ */}
          {/* COLOR MATCH MODE */}
          {/* ============================================ */}
          {gameState.phase === 'playing' && gameState.mode === 'color-match' && (
            <motion.div
              key="color-match"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Progress */}
              <div className="bg-white rounded-full h-3 overflow-hidden shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-pink-500 to-rose-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Find the matching colors!</h2>
                <p className="text-gray-500">
                  Round {gameState.round + 1} of {gameState.totalRounds} • 
                  Pairs found: {gameState.matchedPairs.length}/{gameState.colorPairs.length / 2}
                </p>
              </div>

              {/* Color Grid */}
              <div className={`grid gap-3 ${
                gameState.colorPairs.length <= 6 ? 'grid-cols-3' :
                gameState.colorPairs.length <= 12 ? 'grid-cols-4' : 'grid-cols-4 sm:grid-cols-6'
              }`}>
                {gameState.colorPairs.map((color) => {
                  const isMatched = gameState.matchedPairs.includes(color.name);
                  const isSelected = gameState.selectedColor?.id === color.id;
                  
                  return (
                    <motion.button
                      key={color.id}
                      onClick={() => selectColor(color)}
                      whileHover={{ scale: isMatched ? 1 : 1.05 }}
                      whileTap={{ scale: isMatched ? 1 : 0.95 }}
                      animate={{
                        rotateY: isMatched ? 180 : 0,
                        scale: isMatched ? 0.9 : 1,
                      }}
                      className={`aspect-square rounded-2xl shadow-lg transition-all
                        ${isMatched 
                          ? 'bg-gray-200 cursor-default' 
                          : isSelected
                            ? 'ring-4 ring-yellow-400 ring-offset-2'
                            : 'hover:shadow-xl cursor-pointer'
                        }`}
                      style={{ 
                        backgroundColor: isMatched ? '#E5E7EB' : color.hex,
                        border: color.hex === '#FAFAFA' ? '2px solid #E5E7EB' : 'none'
                      }}
                    >
                      {isMatched && (
                        <span className="text-2xl">✓</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* ============================================ */}
          {/* COLOR GRADE MODE */}
          {/* ============================================ */}
          {gameState.phase === 'playing' && gameState.mode === 'color-grade' && (
            <motion.div
              key="color-grade"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Progress */}
              <div className="bg-white rounded-full h-3 overflow-hidden shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Sort the <span className="capitalize">{currentGradeColor}</span> shades
                </h2>
                <p className="text-gray-500">
                  Lightest → Darkest • Round {gameState.round + 1} of {gameState.totalRounds}
                </p>
              </div>

              {/* Placement Slots */}
              <div className="bg-white/60 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm text-gray-400">Light</span>
                  <div className="flex-1 h-px bg-gradient-to-r from-gray-200 to-gray-400" />
                  <span className="text-sm text-gray-400">Dark</span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {gameState.placedColors.map((color, index) => (
                    <motion.button
                      key={index}
                      onClick={() => placeGradeColor(index)}
                      whileHover={{ scale: color ? 1 : 1.05 }}
                      className={`aspect-square rounded-xl border-3 flex items-center justify-center
                        transition-all text-xs font-bold
                        ${color 
                          ? 'shadow-md' 
                          : gameState.selectedGradeColor
                            ? 'border-dashed border-purple-400 bg-purple-50 cursor-pointer'
                            : 'border-dashed border-gray-300 bg-gray-50'
                        }`}
                      style={{ backgroundColor: color?.hex || undefined }}
                    >
                      {!color && <span className="text-gray-300">{index + 1}</span>}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Available Colors */}
              {gameState.gradeColors.length > 0 && (
                <div className="bg-white/60 rounded-2xl p-6 shadow-lg">
                  <p className="text-sm text-gray-500 mb-3 text-center">Tap a shade, then tap where it goes:</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {gameState.gradeColors.map((color) => (
                      <motion.button
                        key={color.id}
                        onClick={() => selectGradeColor(color)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.95 }}
                        className={`w-14 h-14 rounded-xl shadow-lg transition-all
                          ${gameState.selectedGradeColor?.id === color.id
                            ? 'ring-4 ring-yellow-400 ring-offset-2 scale-110'
                            : ''
                          }`}
                        style={{ backgroundColor: color.hex }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Check Button */}
              {gameState.placedColors.every(c => c !== null) && (
                <div className="flex justify-center">
                  <motion.button
                    onClick={checkGradeAnswer}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 
                      text-white rounded-2xl font-bold text-lg shadow-lg"
                  >
                    Check ✓
                  </motion.button>
                </div>
              )}
            </motion.div>
          )}

          {/* ============================================ */}
          {/* SIZE SORT MODE */}
          {/* ============================================ */}
          {gameState.phase === 'playing' && gameState.mode === 'size-sort' && (
            <motion.div
              key="size-sort"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Progress */}
              <div className="bg-white rounded-full h-3 overflow-hidden shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>

              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">
                  Sort by size: Smallest → Largest
                </h2>
                <p className="text-gray-500">
                  Round {gameState.round + 1} of {gameState.totalRounds}
                </p>
              </div>

              {/* Size Slots - Tower Style */}
              <div className="bg-gradient-to-b from-amber-100 to-orange-100 rounded-2xl p-8 shadow-lg">
                <div className="flex items-end justify-center gap-1 min-h-[200px]">
                  {gameState.placedSizes.map((item, index) => {
                    const slotSize = ((index + 1) / gameState.placedSizes.length) * 100;
                    return (
                      <motion.button
                        key={index}
                        onClick={() => placeSize(index)}
                        whileHover={{ scale: item ? 1 : 1.05 }}
                        className={`rounded-lg transition-all flex items-center justify-center
                          ${item 
                            ? 'shadow-lg' 
                            : gameState.selectedSize
                              ? 'border-2 border-dashed border-orange-400 bg-orange-50/50 cursor-pointer'
                              : 'border-2 border-dashed border-gray-300 bg-white/50'
                          }`}
                        style={{
                          width: `${slotSize}%`,
                          maxWidth: '80px',
                          minWidth: '30px',
                          height: item 
                            ? `${(item.size / gameState.placedSizes.length) * 150 + 30}px`
                            : `${slotSize + 30}px`,
                          backgroundColor: item?.color || undefined,
                        }}
                      >
                        {!item && (
                          <span className="text-xs text-gray-400">{index + 1}</span>
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Available Sizes */}
              {gameState.sizeItems.length > 0 && (
                <div className="bg-white/60 rounded-2xl p-6 shadow-lg">
                  <p className="text-sm text-gray-500 mb-3 text-center">Tap a block, then tap where it goes:</p>
                  <div className="flex flex-wrap justify-center items-end gap-2">
                    {gameState.sizeItems.map((item) => {
                      const displaySize = (item.size / 10) * 60 + 30;
                      return (
                        <motion.button
                          key={item.id}
                          onClick={() => selectSize(item)}
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.95 }}
                          className={`rounded-lg shadow-lg transition-all
                            ${gameState.selectedSize?.id === item.id
                              ? 'ring-4 ring-yellow-400 ring-offset-2'
                              : ''
                            }`}
                          style={{
                            backgroundColor: item.color,
                            width: `${displaySize}px`,
                            height: `${displaySize}px`,
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Check Button */}
              {gameState.placedSizes.every(s => s !== null) && (
                <div className="flex justify-center">
                  <motion.button
                    onClick={checkSizeAnswer}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 
                      text-white rounded-2xl font-bold text-lg shadow-lg"
                  >
                    Check ✓
                  </motion.button>
                </div>
              )}
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
                  {feedback === 'perfect' ? 'Perfect!' : feedback === 'correct' ? 'Correct!' : 'Try again!'}
                </p>
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

              <h2 className="text-4xl font-bold text-gray-800">Amazing Work!</h2>

              <div className="bg-white rounded-2xl p-8 shadow-lg space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-rose-50 rounded-xl p-4">
                    <p className="text-3xl font-bold text-rose-600">{gameState.score}</p>
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
