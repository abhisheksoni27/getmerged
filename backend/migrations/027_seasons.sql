-- Contributor XP seasons (AC2): fixed UTC date-range config. The active
-- season (start_date <= today < end_date) gates all season XP, level and
-- rank math; rows are seeded lazily by prtracker.CurrentSeason.
CREATE TABLE IF NOT EXISTS seasons (
    id INTEGER PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(64) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    UNIQUE KEY uq_seasons_range (start_date, end_date)
);
