import sys
import os

# Add the src directory to sys.path
# This allows tests to import from 'flusight' without installing the package
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))
