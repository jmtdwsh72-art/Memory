/**
 * Python Domain Knowledge Module
 * 
 * Comprehensive beginner-focused Python learning resource covering
 * fundamentals, common pitfalls, and practical applications.
 */

import { KnowledgeModule } from '../utils/knowledge-loader';

export const pythonKnowledge: KnowledgeModule = {
  domain: "Python Programming",
  
  summary: "Python is a high-level, interpreted programming language known for its simplicity and readability. Perfect for beginners, it's widely used in web development, data science, automation, and AI. Python's philosophy emphasizes code readability with significant indentation and a design philosophy that prioritizes developer productivity.",
  
  keyConcepts: [
    "Variables and Data Types (int, float, str, bool, list, dict, tuple)",
    "Control Flow (if/elif/else, for loops, while loops)",
    "Functions and Parameters (def, return, *args, **kwargs)",
    "Object-Oriented Programming (classes, inheritance, methods)",
    "Exception Handling (try/except/finally)",
    "Modules and Packages (import, pip, virtual environments)",
    "List Comprehensions and Generators",
    "Decorators and Context Managers",
    "File I/O and Path Handling",
    "Python Standard Library"
  ],
  
  commonMistakes: [
    "Indentation errors - Python uses indentation instead of braces for code blocks",
    "Mutable default arguments in function definitions (use None instead)",
    "Not using virtual environments - always isolate project dependencies",
    "Mixing tabs and spaces - choose one and stick with it (PEP 8 recommends spaces)",
    "Not handling exceptions properly - bare except clauses catch everything",
    "Using global variables excessively instead of passing parameters",
    "Not following PEP 8 naming conventions (snake_case for variables/functions)",
    "Modifying a list while iterating over it - use list comprehensions or copy",
    "Not understanding the difference between '==' and 'is' operators",
    "Ignoring Python's zen principles - explicit is better than implicit"
  ],
  
  useCases: [
    "Web Development - Django, Flask, FastAPI for building web applications",
    "Data Science - Pandas, NumPy, Matplotlib for data analysis and visualization",
    "Machine Learning - Scikit-learn, TensorFlow, PyTorch for AI models",
    "Automation and Scripting - Automate repetitive tasks, file processing",
    "Web Scraping - BeautifulSoup, Scrapy for extracting web data",
    "API Development - REST APIs, GraphQL endpoints, microservices",
    "Desktop Applications - Tkinter, PyQt, Kivy for GUI applications",
    "Game Development - Pygame for 2D games and prototyping",
    "Scientific Computing - SciPy, SymPy for mathematical computations",
    "DevOps and Infrastructure - Ansible, automation scripts, system administration"
  ],
  
  recommendedResources: [
    {
      name: "Python.org Official Tutorial",
      url: "https://docs.python.org/3/tutorial/"
    },
    {
      name: "Automate the Boring Stuff with Python",
      url: "https://automatetheboringstuff.com/"
    },
    {
      name: "Python for Everybody Specialization (Coursera)",
      url: "https://www.coursera.org/specializations/python"
    },
    {
      name: "Real Python - Tutorials and Articles",
      url: "https://realpython.com/"
    },
    {
      name: "Python Package Index (PyPI)",
      url: "https://pypi.org/"
    },
    {
      name: "PEP 8 - Python Style Guide",
      url: "https://pep8.org/"
    },
    {
      name: "Python Tutor - Visualize Code Execution",
      url: "https://pythontutor.com/"
    },
    {
      name: "Codecademy Python Course",
      url: "https://www.codecademy.com/learn/learn-python-3"
    },
    {
      name: "Python Weekly Newsletter",
      url: "https://pythonweekly.com/"
    },
    {
      name: "Stack Overflow Python Tag",
      url: "https://stackoverflow.com/questions/tagged/python"
    }
  ]
};