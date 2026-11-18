#!/usr/bin/env python3
"""Build the paste page for the Notion tutorial from sections/*.md and code/*.

    build.py TEMPLATE OUT_HTML

Section syntax (on top of Markdown):
    ---front matter: page, where, title, gap---
    @@note run|install      a standard note (C++ build note is added when a section has C++)
    :::toggle Title         a toggle (Notion toggle list) holding the lines up to :::
    @@code FILE             the tested file from code/, as a fenced code block
"""
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LANG = {'.py': 'python', '.cpp': 'cpp', '.txt': 'cmake'}
NOTES = {
    'run': '> Python 範例可以直接用 `python3 檔名.py` 執行（要先 `source /opt/ros/humble/setup.bash`），'
           '或像 Topic 頁的 Python 範例一樣放進 package（`setup.py` 的 `entry_points`）用 `ros2 run` 執行。',
    'cpp': '> C++ 範例放進 ament_cmake package 的 `src/`。建立 package 時把依賴一起加上，'
           '`package.xml` 和 `CMakeLists.txt` 的 `find_package` 會自動寫好：'
           '`ros2 pkg create --build-type ament_cmake my_pkg --dependencies rclcpp std_msgs example_interfaces rosbag2_cpp`。'
           '每個 `.cpp` 在 `CMakeLists.txt` 加上 `add_executable`、`ament_target_dependencies`、`install`'
           '（和 Topic 頁的 C++ 範例一樣，依賴寫在每個檔案的標題上），`colcon build` 後用 '
           '`ros2 run <你的 package> <執行檔>` 執行。',
    'install': '> 範例用到 `example_interfaces`（和 `action_tutorials_interfaces`），`ros-humble-desktop` 已內建。'
               '找不到的話：`sudo apt install ros-humble-example-interfaces ros-humble-action-tutorials-interfaces`',
}


def code_block(name):
    text = open(os.path.join(HERE, 'code', name)).read().rstrip('\n')
    return f'```{LANG[os.path.splitext(name)[1]]}\n{text}\n```'


def tidy(lines):
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(lines)).strip() + '\n'


def build(path):
    raw = open(path).read()
    front, body = re.match(r'---\n(.*?)\n---\n(.*)', raw, re.S).groups()
    meta = dict(line.split(': ', 1) for line in front.splitlines())
    has_cpp = '.cpp' in body
    lines, toggles, rich, plain = body.splitlines(), [], [], []
    rich += [f'## {meta["title"]}', '']
    plain += [f'## {meta["title"]}', '']
    notes = re.findall(r'^@@note (\w+)$', body, re.M)
    if has_cpp:
        notes.insert(1 if 'run' in notes else 0, 'cpp')
    for n in notes:
        rich += [NOTES[n], '']
        plain += [NOTES[n], '']
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith('@@note'):
            i += 1
            continue
        m = re.match(r'^:::toggle (.+)$', line)
        if m:
            inner = []
            i += 1
            while lines[i] != ':::':
                inner.append(code_block(lines[i][7:]) if lines[i].startswith('@@code ') else lines[i])
                i += 1
            content = '\n'.join(inner).strip()
            toggles.append({'title': m.group(1), 'content': content})
            rich += ['', f'<details>\n<summary>{m.group(1)}</summary>\n\n{content}\n\n</details>', '']
            plain += ['', f'**▸ {m.group(1)}**\n\n{content}', '']
        elif line.startswith('@@code '):
            rich += ['', code_block(line[7:]), '']
            plain += ['', code_block(line[7:]), '']
        else:
            rich.append(line)
            plain.append(line)
        i += 1
    letter = os.path.splitext(os.path.basename(path))[0]
    return {'id': letter, 'gap': meta['gap'], 'page': meta['page'], 'where': meta['where'],
            'title': meta['title'], 'rich': tidy(rich), 'plain': tidy(plain), 'toggles': len(toggles)}


def main():
    sections = [build(p) for p in sorted(glob.glob(os.path.join(HERE, 'sections', '*.md')))]
    data = json.dumps(sections, ensure_ascii=False).replace('</', '<\\/')
    tpl = open(sys.argv[1]).read()
    open(sys.argv[2], 'w').write(tpl.replace('/*SECTIONS*/[]', data))
    for s in sections:
        print(s['id'], s['title'], f'toggles={s["toggles"]}')


if __name__ == '__main__':
    main()
