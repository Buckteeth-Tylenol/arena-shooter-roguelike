# Arena Shooter Roguelike

A 2D roguelike arena shooter with wave-based combat and a dynamic card-based upgrade system. Defeat waves of escalating enemies and choose from random upgrades after each wave to customize your playstyle.

## Features

### Core Gameplay
- **Wave-Based Combat**: Survive successive waves of enemies with increasing difficulty
- **Player Box**: Control a square hero character with movement and firing mechanics
- **Dynamic Enemies**: Enemies scale in health, speed, and damage with each wave
- **Upgrade System**: After each wave, choose from 3 random capability cards to enhance your abilities

### Upgrade Categories

#### Projectile Mechanics (11 cards)
- Square Fragmentation, Elastic Bound, Heavy Caliber, Piercing Shard, Boomerang Shot, Arc Lightning, and more
- Fundamentally change how your bullets behave

#### Defensive Abilities (11 cards)
- Thorn Plating, Corner Shields, Aura of Frost, Absorbent Core, Hardened Angles, Resilient Grid
- Protect your box through shields, damage reduction, and reactive abilities

#### Movement & Mobility (9 cards)
- Warp Blink, Impact Thrusters, Rebound Step, Light Footed, Density Shift, Slipstream
- Enhance mobility and positioning

#### Status Effects (8+ cards)
- Corrosive Acids, Gravity Trap, Magnetic Pull, Combustion Chain, Soul Leech
- Leverage elemental damage and crowd control

#### Economic/Meta (5+ cards)
- Glass Cannon, Investment Plan, Lucky Square, Recycle Bin
- Risk-reward trades and special mechanics

## Controls

- **Arrow Keys or WASD**: Move your box
- **Space**: Fire bullets toward your cursor direction
- **Click Upgrade Cards**: Choose upgrades after each wave

## Game States

1. **Wave Phase**: Defeat all enemies on screen
2. **Upgrade Phase**: Choose 1 of 3 random upgrades
3. **Game Over**: When your health reaches 0

## Mechanics

### Scaling
- Enemies per wave: `5 + wave * 2`
- Enemy health: `20 + wave * 5`
- Enemy damage: `5 + wave * 2`
- Enemy speed: `100 + wave * 20`

### Synergies
Many upgrades create powerful synergies:
- **Combustion Chain** + fire-based upgrades
- **Piercing Shard** + high-fire-rate builds
- **Arc Lightning** + crowd-focused strategies
- **Heavy Caliber** + knockback mechanics

## Development

The game is built with:
- **Pure HTML5 Canvas**: No external libraries
- **Vanilla JavaScript**: Object-oriented entity system
- **Modular Design**: Easy to add new upgrades and mechanics

## Future Enhancements

- [ ] Boss enemies at wave milestones
- [ ] Procedurally generated arenas
- [ ] Leaderboard system
- [ ] More upgrade cards (60+ total planned)
- [ ] Special item drops
- [ ] Combo/chain reaction system
- [ ] Visual effects and particle system
- [ ] Sound effects and music
- [ ] Mobile touch controls

## License

MIT