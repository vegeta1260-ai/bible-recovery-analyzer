#!/usr/bin/env python3
import argparse
from scripts.import_macula_greek import main as import_greek
from scripts.import_macula_hebrew import main as import_hebrew
p=argparse.ArgumentParser(); p.add_argument('--force',action='store_true'); args=p.parse_args()
import_greek(force=args.force); import_hebrew(force=args.force)
