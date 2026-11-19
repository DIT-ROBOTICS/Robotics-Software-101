from my_interfaces.msg import Station

def main():
    # 1. 常數掛在 class 上，不用建立訊息就能用
    print(f'Station.KIND_CHARGER = {Station.KIND_CHARGER!r}')

    # 2. 欄位是每一筆訊息自己的資料；沒給的欄位用預設值
    s = Station(id='c1', kind=Station.KIND_CHARGER, x=1.0, y=2.0)
    print(s)

    # 3. 比較時用常數，不要自己打字串（打錯字不會有任何錯誤訊息）
    if s.kind == Station.KIND_CHARGER:
        print(f'{s.id} is a charger')

    # 4. ROS 不會檢查 kind 是不是其中一個 KIND_*
    s.kind = 'banana'
    print(f'kind = {s.kind!r}, no error')

    # 5. 常數不能改
    try:
        Station.KIND_CHARGER = 'battery'
    except AttributeError as e:
        print(f'AttributeError: {e}')

if __name__ == '__main__':
    main()
