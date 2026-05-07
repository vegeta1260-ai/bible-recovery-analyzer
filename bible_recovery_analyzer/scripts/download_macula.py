#!/usr/bin/env python3
import subprocess
from pathlib import Path

def clone_or_pull(url, target):
    if target.exists():
        print(f"exists: {target}, skip clone")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(['git','clone','--depth','1',url,str(target)], check=True)

def main():
    clone_or_pull('https://github.com/Clear-Bible/macula-greek.git', Path('data/sources/macula-greek'))
    clone_or_pull('https://github.com/Clear-Bible/macula-hebrew.git', Path('data/sources/macula-hebrew'))

if __name__=='__main__': main()
