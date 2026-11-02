# Installation boundary — portable 2.0.0

Keep the complete `taiwan-context-reviewer` directory together. It contains SKILL.md, references, original examples, tests and the optional local script. Do not overwrite the existing upstream `taiwan-zh-tw-localization` skill: the names and directories are intentionally distinct.

Place this directory in a skill location that your chosen agent explicitly supports, or ask it to read the local SKILL.md by path. Verify that the agent actually loaded it; a successful file copy alone is not execution evidence. No install script, shell hook, account link, network download or automatic deployment is bundled.

Without Python, the written human-review workflow remains usable, but automated checks must be marked NOT_RUN. Python's standard library is enough for the supplied CLI; no pip packages are required. Linux checks are included; Windows native launch and every vendor's skill discovery are not claimed as verified.

Use a separate output file and inspect suggestions before applying them. This source candidate does not change the official TLS Suite registry or already published releases.
