#!/usr/bin/env python3
"""Build the word-frequency lookup used for Zipf scoring.

Input:  wordfreq's English list (large_en.msgpack.gz, from the `wordfreq` Python package).
Output: public/freq/<shard>.txt  - one file per 2-character prefix. Each line is
                                    "<bucket> <word> <word> ...", where bucket b means
                                    Zipf = 9 - b/100 (wordfreq's centibel format).
        public/freq/index.json    - percentile table: for each bucket, the share of the
                                    vocabulary that is MORE common (0 = most common).

Run once (the output is committed):
    pip install wordfreq msgpack
    python3 scripts/build-freq.py
or point it at a file:  python3 scripts/build-freq.py path/to/large_en.msgpack.gz
"""
import gzip, json, os, re, sys, shutil
from collections import defaultdict

import msgpack

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "freq")


def find_source():
    if len(sys.argv) > 1:
        return sys.argv[1]
    import wordfreq  # noqa: F401  (only to locate its data directory)
    return os.path.join(os.path.dirname(wordfreq.__file__), "data", "large_en.msgpack.gz")


def shard_of(word):
    """Must match shardOf() in public/shared/zipf.js."""
    head = (word + "__")[:2]
    return "".join(c if re.match(r"[a-z0-9]", c) else "_" for c in head)


def main():
    data = msgpack.load(gzip.open(find_source(), "rb"), raw=False)
    header, buckets = data[0], data[1:]
    assert header.get("format") == "cB", header

    total = sum(len(b) for b in buckets)
    shards = defaultdict(lambda: defaultdict(list))
    percentile = []
    seen = 0
    for b, words in enumerate(buckets):
        # Midpoint rank of the bucket, as a percent of the vocabulary.
        percentile.append(round((seen + len(words) / 2) / total * 100, 4))
        seen += len(words)
        for w in words:
            shards[shard_of(w)][b].append(w)

    if os.path.isdir(OUT):
        for f in os.listdir(OUT):
            if f.endswith(".txt") and f != "NOTICE.txt" or f == "index.json":
                os.remove(os.path.join(OUT, f))
    os.makedirs(OUT, exist_ok=True)
    for name, by_bucket in shards.items():
        with open(os.path.join(OUT, f"{name}.txt"), "w", encoding="utf-8") as fh:
            for b in sorted(by_bucket):
                fh.write(f"{b} {' '.join(by_bucket[b])}\n")
    with open(os.path.join(OUT, "index.json"), "w") as fh:
        json.dump({"source": "wordfreq large_en", "words": total, "percentile": percentile}, fh)
    print(f"{total} words in {len(shards)} shards -> {os.path.abspath(OUT)}")


if __name__ == "__main__":
    main()
