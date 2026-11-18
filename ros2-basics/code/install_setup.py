data_files=[
    ('share/ament_index/resource_index/packages', ['resource/' + package_name]),
    ('share/' + package_name, ['package.xml']),
    ('share/' + package_name + '/launch', glob('launch/*_launch.py')),
    ('share/' + package_name + '/params', glob('params/*.yaml')),
],
