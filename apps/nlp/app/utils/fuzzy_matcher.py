"""Fuzzy matching utilities using rapidfuzz."""

from rapidfuzz import fuzz, process


def title_similarity(title1: str, title2: str) -> float:
    """Calculate similarity between two titles.

    Returns a score from 0.0 to 100.0 using weighted ratio.
    Handles case insensitivity and minor variations.
    """
    if not title1 or not title2:
        return 0.0

    # Normalize inputs
    t1 = title1.strip().lower()
    t2 = title2.strip().lower()

    if t1 == t2:
        return 100.0

    # Use token sort ratio for better handling of word order differences
    score = fuzz.token_sort_ratio(t1, t2)

    return float(score)


def author_similarity(authors1: list[str], authors2: list[str]) -> float:
    """Calculate similarity between two author lists.

    Returns a score from 0.0 to 100.0.
    Compares last names primarily, with bonus for first name matches.
    """
    if not authors1 or not authors2:
        return 0.0

    # Normalize author names
    norm1 = [_normalize_author_name(a) for a in authors1]
    norm2 = [_normalize_author_name(a) for a in authors2]

    if not norm1 or not norm2:
        return 0.0

    # Compare each author in list1 to best match in list2
    total_score = 0.0
    matches = 0

    for a1 in norm1:
        best_score = 0.0
        for a2 in norm2:
            score = _compare_single_author(a1, a2)
            if score > best_score:
                best_score = score

        if best_score > 50:  # Threshold for valid match
            total_score += best_score
            matches += 1

    # Average score, penalize for length differences
    if matches == 0:
        return 0.0

    avg_score = total_score / max(len(norm1), len(norm2))

    # Bonus if same number of authors
    if len(norm1) == len(norm2):
        avg_score = min(100.0, avg_score * 1.1)

    return float(avg_score)


def _normalize_author_name(author: str) -> str:
    """Normalize an author name for comparison."""
    author = author.strip().lower()
    # Remove common prefixes/suffixes
    author = author.replace("et al.", "").replace("vd.", "").strip()
    # Remove extra spaces
    author = " ".join(author.split())
    return author


def _compare_single_author(a1: str, a2: str) -> float:
    """Compare two normalized author names.

    Returns score from 0.0 to 100.0.
    """
    if a1 == a2:
        return 100.0

    # Extract last names (usually first part before comma, or last word)
    last1 = _extract_last_name(a1)
    last2 = _extract_last_name(a2)

    # Last name comparison is most important
    last_score = fuzz.ratio(last1, last2)

    # If last names don't match well, low score
    if last_score < 70:
        return last_score * 0.5

    # Extract first names/initials
    first1 = _extract_first_name(a1)
    first2 = _extract_first_name(a2)

    if first1 and first2:
        first_score = fuzz.ratio(first1, first2)
        # Weight: 70% last name, 30% first name
        return last_score * 0.7 + first_score * 0.3

    # If no first name to compare, rely on last name
    return last_score


def _extract_last_name(author: str) -> str:
    """Extract last name from normalized author string."""
    if "," in author:
        return author.split(",")[0].strip()
    # For "First Last" format, return last word
    parts = author.split()
    return parts[-1] if parts else author


def _extract_first_name(author: str) -> str:
    """Extract first name/initials from normalized author string."""
    if "," in author:
        return author.split(",")[1].strip() if len(author.split(",")) > 1 else ""
    # For "First Last" format, return all but last word
    parts = author.split()
    return " ".join(parts[:-1]) if len(parts) > 1 else ""


def find_best_match(query: str, choices: list[str], threshold: float = 70.0) -> tuple[str | None, float]:
    """Find best match for query in choices list.

    Returns (best_match, score) or (None, 0.0) if below threshold.
    """
    if not query or not choices:
        return None, 0.0

    result = process.extractOne(query, choices, scorer=fuzz.WRatio)
    if result is None:
        return None, 0.0

    match, score, _ = result
    if score >= threshold:
        return match, float(score)

    return None, float(score)
